import "server-only";

import { z } from "zod";

/**
 * ATS integration + SSRF defense.
 *
 * This app fetches URLs server-side, which is the classic SSRF sink. The rules,
 * enforced here and nowhere bypassed:
 *
 *  1. We NEVER fetch a user-supplied URL. The user pastes a careers URL; we only
 *     parse it to extract (provider, slug) and then CONSTRUCT the request URL
 *     ourselves from a fixed template.
 *  2. Outbound requests may only go to an exact hostname allowlist.
 *  3. The slug is validated against a strict charset before it touches a path,
 *     so no `../`, no absolute URL, no injected host.
 *  4. Redirects are disabled, with a 10s timeout and a response size cap.
 */

export type AtsProvider = "greenhouse" | "lever" | "ashby";

/** The ONLY hosts fetchAts may talk to. Exact match, no suffix matching. */
export const ATS_API_HOSTS: Record<AtsProvider, string> = {
  greenhouse: "boards-api.greenhouse.io",
  lever: "api.lever.co",
  ashby: "api.ashbyhq.com",
};

const ATS_API_HOST_SET = new Set(Object.values(ATS_API_HOSTS));

/** Strict slug charset. Must match before interpolation into any path. */
export const SLUG_RE = /^[A-Za-z0-9_-]{1,100}$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB cap

export interface NormalizedJob {
  externalId: string;
  title: string;
  location: string | null;
  url: string;
}

export interface DetectResult {
  provider: AtsProvider;
  slug: string;
}

/**
 * Detect the ATS provider + slug from a pasted careers URL. Detection is based
 * only on known ATS host suffixes; unknown hosts return null. We do NOT and
 * cannot infer providers by fetching the pasted URL (that would be SSRF).
 *
 * Supported inputs:
 *   Greenhouse: boards.greenhouse.io/acme, job-boards.greenhouse.io/acme,
 *               boards.greenhouse.io/embed/job_board?for=acme
 *   Lever:      jobs.lever.co/acme
 *   Ashby:      jobs.ashbyhq.com/acme
 */
export function detectAts(pastedUrl: string): DetectResult | null {
  let parsed: URL;
  try {
    parsed = new URL(pastedUrl.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const segments = parsed.pathname.split("/").filter(Boolean);

  // Greenhouse -------------------------------------------------------------
  if (host === "greenhouse.io" || host.endsWith(".greenhouse.io")) {
    // Embed form: /embed/job_board?for=acme
    const forParam = parsed.searchParams.get("for");
    if (forParam && isValidSlug(forParam)) {
      return { provider: "greenhouse", slug: forParam };
    }
    // Path form: first non-"embed" segment is the board token.
    const slug = segments.find((s) => s !== "embed" && s !== "job_board");
    if (slug && isValidSlug(slug)) return { provider: "greenhouse", slug };
    return null;
  }

  // Lever ------------------------------------------------------------------
  if (host === "lever.co" || host.endsWith(".lever.co")) {
    const slug = segments[0];
    if (slug && isValidSlug(slug)) return { provider: "lever", slug };
    return null;
  }

  // Ashby ------------------------------------------------------------------
  if (host === "ashbyhq.com" || host.endsWith(".ashbyhq.com")) {
    const slug = segments[0];
    if (slug && isValidSlug(slug)) return { provider: "ashby", slug };
    return null;
  }

  return null;
}

/** Construct the API URL from provider + slug. Throws on an invalid slug. */
export function buildAtsApiUrl(provider: AtsProvider, slug: string): string {
  if (!isValidSlug(slug)) {
    throw new Error("Invalid ATS slug");
  }
  const encoded = encodeURIComponent(slug);
  switch (provider) {
    case "greenhouse":
      return `https://${ATS_API_HOSTS.greenhouse}/v1/boards/${encoded}/jobs`;
    case "lever":
      return `https://${ATS_API_HOSTS.lever}/v0/postings/${encoded}?mode=json`;
    case "ashby":
      return `https://${ATS_API_HOSTS.ashby}/posting-api/job-board/${encoded}`;
  }
}

export class AtsFetchError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "AtsFetchError";
  }
}

/**
 * Perform a hardened GET against a URL we constructed. Re-validates the host
 * against the allowlist as a defense-in-depth check even though the caller
 * built the URL, disables redirects, enforces a timeout and a size cap.
 */
async function safeGet(url: string): Promise<unknown> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !ATS_API_HOST_SET.has(parsed.hostname)) {
    // Should be impossible via buildAtsApiUrl; guard anyway.
    throw new AtsFetchError(`Refusing to fetch non-allowlisted host: ${parsed.hostname}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "error", // never follow redirects (SSRF pivot)
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "SnipeBot/1.0 (+https://snipe.example)",
      },
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new AtsFetchError("ATS request timed out", undefined, true);
    }
    throw new AtsFetchError(`ATS request failed: ${(err as Error).message}`, undefined, true);
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 404) {
    throw new AtsFetchError("ATS board not found", 404, false);
  }
  if (res.status === 429 || res.status >= 500) {
    throw new AtsFetchError(`ATS returned ${res.status}`, res.status, true);
  }
  if (!res.ok) {
    throw new AtsFetchError(`ATS returned ${res.status}`, res.status, false);
  }

  // Size-capped read so a hostile/huge body can't exhaust memory.
  const contentLength = Number(res.headers.get("content-length") ?? "0");
  if (contentLength > MAX_RESPONSE_BYTES) {
    throw new AtsFetchError("ATS response too large", undefined, false);
  }
  const body = await readCapped(res, MAX_RESPONSE_BYTES);
  try {
    return JSON.parse(body);
  } catch {
    throw new AtsFetchError("ATS returned invalid JSON", undefined, false);
  }
}

async function readCapped(res: Response, cap: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > cap) {
      await reader.cancel();
      throw new AtsFetchError("ATS response exceeded size cap", undefined, false);
    }
    out += decoder.decode(value, { stream: true });
  }
  out += decoder.decode();
  return out;
}

/* --------------------------------------------------------------------------
 * Untrusted third-party parsers. ATS payloads are validated with Zod and we
 * keep only the fields we need. `.passthrough()`-free, `.catch()`-guarded.
 * ------------------------------------------------------------------------ */

const greenhouseSchema = z.object({
  jobs: z
    .array(
      z.object({
        id: z.union([z.number(), z.string()]),
        title: z.string(),
        absolute_url: z.string().url(),
        location: z.object({ name: z.string() }).nullish(),
      }),
    )
    .default([]),
});

const leverSchema = z.array(
  z.object({
    id: z.string(),
    text: z.string(),
    hostedUrl: z.string().url(),
    categories: z.object({ location: z.string().nullish() }).nullish(),
  }),
);

const ashbySchema = z.object({
  jobs: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        location: z.string().nullish(),
        jobUrl: z.string().url().nullish(),
        applyUrl: z.string().url().nullish(),
      }),
    )
    .default([]),
});

function parseJobs(provider: AtsProvider, raw: unknown): NormalizedJob[] {
  switch (provider) {
    case "greenhouse": {
      const data = greenhouseSchema.parse(raw);
      return data.jobs.map((j) => ({
        externalId: String(j.id),
        title: j.title,
        location: j.location?.name ?? null,
        url: j.absolute_url,
      }));
    }
    case "lever": {
      const data = leverSchema.parse(raw);
      return data.map((j) => ({
        externalId: j.id,
        title: j.text,
        location: j.categories?.location ?? null,
        url: j.hostedUrl,
      }));
    }
    case "ashby": {
      const data = ashbySchema.parse(raw);
      return data.jobs.map((j) => ({
        externalId: j.id,
        title: j.title,
        location: j.location ?? null,
        url: j.jobUrl ?? j.applyUrl ?? "",
      }));
    }
  }
}

/** Fetch + normalize the current job listings for a company. */
export async function fetchAtsJobs(
  provider: AtsProvider,
  slug: string,
): Promise<NormalizedJob[]> {
  const url = buildAtsApiUrl(provider, slug);
  const raw = await safeGet(url);
  return parseJobs(provider, raw).filter((j) => j.url.startsWith("https://"));
}

/** Turn "acme-corp_labs" into "Acme Corp Labs" as a display-name fallback. */
export function humanizeSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

const greenhouseBoardSchema = z.object({ name: z.string() });

/**
 * Best-effort human-readable company name. Greenhouse exposes it on the board
 * metadata endpoint (same allowlisted host); Lever/Ashby don't, so we humanize
 * the slug. Always falls back gracefully — a name is cosmetic.
 */
export async function fetchCompanyName(
  provider: AtsProvider,
  slug: string,
): Promise<string> {
  if (provider === "greenhouse" && isValidSlug(slug)) {
    try {
      const raw = await safeGet(
        `https://${ATS_API_HOSTS.greenhouse}/v1/boards/${encodeURIComponent(slug)}`,
      );
      const parsed = greenhouseBoardSchema.safeParse(raw);
      if (parsed.success && parsed.data.name.trim()) {
        return parsed.data.name.trim().slice(0, 200);
      }
    } catch {
      // fall through to humanized slug
    }
  }
  return humanizeSlug(slug);
}
