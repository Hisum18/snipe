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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
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
        <label htmlFor="careers-url" className="mb-1 block text-sm text-slate-300">
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
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <p className="mt-1 text-xs text-slate-500">
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
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          aria-label="Location filter"
          placeholder="Location: e.g. New York"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={busy}
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-bright disabled:opacity-60"
      >
        {busy ? "Adding…" : "Watch company"}
      </button>
    </form>
  );
}
