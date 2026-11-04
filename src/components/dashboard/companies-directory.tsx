"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Check, Search } from "@/components/icons";
import type { CuratedCompany } from "@/lib/curated-companies";

const PROVIDER_LABEL: Record<CuratedCompany["provider"], string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
};

function keyOf(c: CuratedCompany): string {
  return `${c.provider}:${c.careersUrl.split("/").filter(Boolean).pop()}`;
}

export function CompaniesDirectory({
  companies,
  watchedKeys,
}: {
  companies: readonly CuratedCompany[];
  watchedKeys: string[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [watched, setWatched] = useState(() => new Set(watchedKeys));
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, query]);

  async function watch(company: CuratedCompany) {
    const key = keyOf(company);
    setBusyKey(key);
    setErrorKey(null);
    setError("");
    try {
      const res = await fetch("/api/watches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ careersUrl: company.careersUrl, keywordFilters: [] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorKey(key);
        setError(data.error ?? "Couldn't watch that company.");
        return;
      }
      setWatched((prev) => new Set(prev).add(key));
      router.refresh();
    } catch {
      setErrorKey(key);
      setError("Network error. Try again.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search companies…"
          aria-label="Search companies"
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
        />
      </div>

      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((company) => {
          const key = keyOf(company);
          const isWatched = watched.has(key);
          const busy = busyKey === key;
          return (
            <li
              key={key}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-normal text-white">{company.name}</div>
                <div className="text-xs text-neutral-500">{PROVIDER_LABEL[company.provider]}</div>
                {errorKey === key && <p className="mt-1 text-xs text-destructive">{error}</p>}
              </div>
              <button
                type="button"
                onClick={() => watch(company)}
                disabled={isWatched || busy}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-normal transition-colors disabled:cursor-default disabled:opacity-70 enabled:bg-white enabled:text-black enabled:hover:bg-neutral-200"
              >
                {isWatched ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Watching
                  </>
                ) : busy ? (
                  "Adding…"
                ) : (
                  "Watch"
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 && (
        <p className="mt-4 text-sm text-neutral-400">
          No matches. Try a different name, or paste its careers URL below.
        </p>
      )}
    </div>
  );
}
