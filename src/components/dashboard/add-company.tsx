"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddCompany() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setAdded(false);
    try {
      const res = await fetch("/api/watches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          careersUrl: url.trim(),
          keywordFilters: keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
          locationFilter: location.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't add that company.");
        return;
      }
      setUrl("");
      setKeywords("");
      setLocation("");
      setAdded(true);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="careers-url" className="mb-1 block text-sm text-white/90">
          Careers URL
        </label>
        <input
          id="careers-url"
          type="url"
          required
          placeholder="https://job-boards.greenhouse.io/acme"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={busy}
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <p className="mt-1 text-xs text-neutral-400">
          Greenhouse, Lever, or Ashby. We detect the provider automatically.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          aria-label="Keyword filters (comma separated)"
          placeholder="Keywords: engineer, remote"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          disabled={busy}
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <input
          aria-label="Location filter"
          placeholder="Location: e.g. New York"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={busy}
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {added && !error && <p className="text-sm text-neutral-300">Added.</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-normal text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
      >
        {busy ? "Adding…" : "Watch company"}
      </button>
    </form>
  );
}
