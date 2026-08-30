"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface ProfileRow {
  id: string;
  name: string;
  keywordFilters: string[];
  locationFilter: string | null;
  crossCompany: boolean;
  active: boolean;
}

export function ProfilesSection({
  profiles,
  canUseCrossCompany,
}: {
  profiles: ProfileRow[];
  canUseCrossCompany: boolean;
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [crossCompany, setCrossCompany] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          keywordFilters: keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
          locationFilter: location.trim() || undefined,
          crossCompany: crossCompany && canUseCrossCompany,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't create that profile.");
        return;
      }
      setName("");
      setKeywords("");
      setLocation("");
      setCrossCompany(false);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setRemoving(id);
    try {
      const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-5">
      {profiles.length === 0 ? (
        <p className="text-sm text-slate-500">
          No profiles yet. A profile is a saved keyword/location filter for your alerts.
        </p>
      ) : (
        <ul className="divide-y divide-white/5">
          {profiles.map((p) =>
            editing === p.id ? (
              <li key={p.id} className="py-3">
                <EditProfile
                  profile={p}
                  canUseCrossCompany={canUseCrossCompany}
                  onDone={() => {
                    setEditing(null);
                    router.refresh();
                  }}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {/* User-supplied text rendered as escaped JSX text. */}
                    <span className="truncate font-medium">{p.name}</span>
                    {p.crossCompany && (
                      <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[11px] text-accent-bright">
                        cross-company
                      </span>
                    )}
                    {!p.active && (
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] text-amber-300">
                        inactive
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">
                    {p.keywordFilters.length > 0 ? p.keywordFilters.join(", ") : "all keywords"}
                    {p.locationFilter ? ` · ${p.locationFilter}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(p.id)}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/5"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    disabled={removing === p.id}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50"
                  >
                    {removing === p.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      <form onSubmit={add} className="space-y-3 border-t border-white/10 pt-5">
        <input
          aria-label="Profile name"
          required
          placeholder="Profile name (e.g. Backend roles)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            aria-label="Keyword filters (comma separated)"
            placeholder="Keywords: engineer, staff"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            disabled={busy}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            aria-label="Location filter"
            placeholder="Location: e.g. Remote"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={busy}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        <label
          className={`flex items-center gap-2 text-sm ${
            canUseCrossCompany ? "text-slate-300" : "text-slate-500"
          }`}
        >
          <input
            type="checkbox"
            checked={crossCompany && canUseCrossCompany}
            onChange={(e) => setCrossCompany(e.target.checked)}
            disabled={busy || !canUseCrossCompany}
            className="h-4 w-4 rounded border-white/20 bg-black/20 accent-accent"
          />
          Match across every indexed company
          {!canUseCrossCompany && (
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-slate-400">
              Max only
            </span>
          )}
        </label>

        {error && <p className="text-sm text-rose-300">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-bright disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create profile"}
        </button>
      </form>
    </div>
  );
}

function EditProfile({
  profile,
  canUseCrossCompany,
  onDone,
  onCancel,
}: {
  profile: ProfileRow;
  canUseCrossCompany: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [keywords, setKeywords] = useState(profile.keywordFilters.join(", "));
  const [location, setLocation] = useState(profile.locationFilter ?? "");
  const [crossCompany, setCrossCompany] = useState(profile.crossCompany);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          keywordFilters: keywords.split(",").map((k) => k.trim()).filter(Boolean),
          locationFilter: location.trim() || undefined,
          crossCompany: crossCompany && canUseCrossCompany,
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
      <input
        aria-label="Profile name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={busy}
        className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          aria-label="Keyword filters"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="Keywords (comma separated)"
          disabled={busy}
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          aria-label="Location filter"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location"
          disabled={busy}
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
      <label
        className={`flex items-center gap-2 text-sm ${
          canUseCrossCompany ? "text-slate-300" : "text-slate-500"
        }`}
      >
        <input
          type="checkbox"
          checked={crossCompany && canUseCrossCompany}
          onChange={(e) => setCrossCompany(e.target.checked)}
          disabled={busy || !canUseCrossCompany}
          className="h-4 w-4 rounded border-white/20 bg-black/20 accent-accent"
        />
        Match across every indexed company
        {!canUseCrossCompany && (
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-slate-400">
            Max only
          </span>
        )}
      </label>
      {error && <p className="text-xs text-rose-300">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-bright disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
