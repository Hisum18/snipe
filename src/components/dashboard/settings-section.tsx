"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SettingsSection({
  discordWebhookUrl,
  emailNotificationsEnabled,
  canUseDiscord,
  isMax,
  phoneE164,
  phoneVerified,
}: {
  discordWebhookUrl: string | null;
  emailNotificationsEnabled: boolean;
  canUseDiscord: boolean;
  isMax: boolean;
  phoneE164: string | null;
  phoneVerified: boolean;
}) {
  const router = useRouter();
  const [webhook, setWebhook] = useState(discordWebhookUrl ?? "");
  const [emailOn, setEmailOn] = useState(emailNotificationsEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't save settings.");
        return false;
      }
      setSaved(true);
      router.refresh();
      return true;
    } catch {
      setError("Network error.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Email toggle */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-normal">Email alerts</div>
          <div className="text-xs text-neutral-400">
            Job matches are emailed to you.
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={emailOn}
          disabled={busy}
          onClick={async () => {
            const next = !emailOn;
            setEmailOn(next);
            const ok = await patch({ emailNotificationsEnabled: next });
            if (!ok) setEmailOn(!next); // revert on failure
          }}
          className={`relative h-6 w-11 rounded-full transition ${
            emailOn ? "bg-accent" : "bg-white/20"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow-card transition ${
              emailOn ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>

      {/* Discord webhook */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-normal">Discord webhook</span>
          {!canUseDiscord && (
            <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[11px] text-neutral-400">
              Pro &amp; Max
            </span>
          )}
        </div>
        <p className="mb-2 text-xs text-neutral-400">
          Paste a Discord channel webhook URL to also receive alerts there.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            value={webhook}
            onChange={(e) => setWebhook(e.target.value)}
            placeholder="https://discord.com/api/webhooks/…"
            disabled={busy || !canUseDiscord}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-50"
          />
          <button
            type="button"
            disabled={busy || !canUseDiscord}
            onClick={() => patch({ discordWebhookUrl: webhook.trim() || null })}
            className="shrink-0 rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/[0.06] disabled:opacity-50"
          >
            Save
          </button>
        </div>
        {!isMax && canUseDiscord && (
          <p className="mt-1 text-xs text-neutral-400">
            SMS alerts are available on Max.
          </p>
        )}
      </div>

      {/* SMS (Max only) */}
      {isMax && <PhoneVerify phoneE164={phoneE164} phoneVerified={phoneVerified} />}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && !error && <p className="text-sm text-neutral-300">Saved.</p>}
    </div>
  );
}

function PhoneVerify({
  phoneE164,
  phoneVerified,
}: {
  phoneE164: string | null;
  phoneVerified: boolean;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState(phoneE164 ?? "");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"idle" | "code">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendCode() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/settings/phone", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't send code.");
        return;
      }
      setStage("code");
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/settings/phone/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't verify.");
        return;
      }
      setStage("idle");
      setCode("");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function removePhone() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/settings/phone", { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't remove that number. Try again.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-sm font-normal">SMS alerts</span>
        {phoneVerified && (
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-neutral-300">
            verified
          </span>
        )}
      </div>

      {phoneVerified ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-white/90">{phoneE164}</span>
          <button
            type="button"
            onClick={removePhone}
            disabled={busy}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/[0.06] disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+14155551234"
              disabled={busy || stage === "code"}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-50"
            />
            {stage === "idle" && (
              <button
                type="button"
                onClick={sendCode}
                disabled={busy}
                className="shrink-0 rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/[0.06] disabled:opacity-50"
              >
                Send code
              </button>
            )}
          </div>
          {stage === "code" && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit code"
                disabled={busy}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <button
                type="button"
                onClick={verify}
                disabled={busy}
                className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-normal text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
              >
                Verify
              </button>
            </div>
          )}
        </div>
      )}
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function DangerZone() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function del() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (res.ok) {
        // Full reload (not router.push) to clear all client state after the
        // account + session are gone.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/";
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't delete account.");
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
      <h2 className="text-lg font-normal text-destructive">Delete account</h2>
      <p className="mt-1 text-sm text-neutral-400">
        Permanently deletes your account, watched companies, profiles, and alert
        history. This cannot be undone.
      </p>
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-4 rounded-lg border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
        >
          Delete my account
        </button>
      ) : (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={del}
            disabled={busy}
            className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
          >
            {busy ? "Deleting…" : "Yes, permanently delete"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={busy}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/[0.06]"
          >
            Cancel
          </button>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
