"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface WatchRow {
  id: string;
  companyName: string;
  atsProvider: string;
  atsSlug: string;
  keywordFilters: string[];
  locationFilter: string | null;
  active: boolean;
}

export function WatchList({ watches }: { watches: WatchRow[] }) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function remove(id: string) {
    setRemoving(id);
    setConfirming(null);
    setError("");
    try {
      const res = await fetch(`/api/watches/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't remove that company. Try again.");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setRemoving(null);
    }
  }

  if (watches.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        No companies watched yet. Add one above to start getting alerts.
      </p>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-white/[0.06]">
        {watches.map((w) =>
          editing === w.id ? (
            <li key={w.id} className="py-3">
              <EditWatch
                watch={w}
                onDone={() => {
                  setEditing(null);
                  router.refresh();
                }}
                onCancel={() => setEditing(null)}
              />
            </li>
          ) : (
            <li key={w.id} className="py-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {/* ATS-derived text rendered as JSX text — auto-escaped by React. */}
                <span className="max-w-full truncate font-normal">{w.companyName}</span>
                <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[11px] uppercase text-neutral-400">
                  {w.atsProvider}
                </span>
                {!w.active && (
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-neutral-300">
                    inactive
                  </span>
                )}
              </div>
              <div className="mt-0.5 truncate text-xs text-neutral-400">
                {w.keywordFilters.length > 0 ? w.keywordFilters.join(", ") : "all roles"}
                {w.locationFilter ? ` · ${w.locationFilter}` : ""}
              </div>
              <div className="mt-2 flex gap-2">
                {confirming === w.id ? (
                  <>
                    <span className="self-center text-xs text-neutral-400">Remove?</span>
                    <button
                      type="button"
                      onClick={() => remove(w.id)}
                      disabled={removing === w.id}
                      className="rounded-lg border border-destructive/40 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      {removing === w.id ? "Removing…" : "Confirm"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-white/90 hover:bg-white/[0.06]"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditing(w.id)}
                      className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-white/90 hover:bg-white/[0.06]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(w.id)}
                      className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-white/90 hover:bg-white/[0.06]"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </li>
          ),
        )}
      </ul>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}

function EditWatch({
  watch,
  onDone,
  onCancel,
}: {
  watch: WatchRow;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [keywords, setKeywords] = useState(watch.keywordFilters.join(", "));
  const [location, setLocation] = useState(watch.locationFilter ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/watches/${watch.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          keywordFilters: keywords.split(",").map((k) => k.trim()).filter(Boolean),
          locationFilter: location.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't save.");
        return;
      }
      onDone();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-normal">{watch.companyName}</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          aria-label="Keyword filters"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="Keywords (comma separated)"
          disabled={busy}
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <input
          aria-label="Location filter"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location"
          disabled={busy}
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-white px-3 py-1.5 text-xs font-normal text-black hover:bg-neutral-200 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/90 hover:bg-white/[0.06]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
