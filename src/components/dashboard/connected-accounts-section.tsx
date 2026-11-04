"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function ConnectedAccountsSection({ googleLinked }: { googleLinked: boolean }) {
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-normal">Google</div>
        <div className="text-xs text-neutral-400">
          {googleLinked
            ? "Connected — you can sign in with Google."
            : "Connect your Google account for a second way to sign in."}
        </div>
      </div>
      {googleLinked ? (
        <span className="rounded bg-white/10 px-2 py-1 text-xs text-neutral-300">Connected</span>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            // Signing in while already authenticated links this Google
            // account to the CURRENT session's user — Auth.js resolves the
            // existing user from the session, not from the OAuth profile's
            // email, so this can only ever link to your own account.
            void signIn("google", { callbackUrl: "/settings?connected=1" });
          }}
          className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/[0.06] disabled:opacity-50"
        >
          {busy ? "Redirecting…" : "Connect Google"}
        </button>
      )}
    </div>
  );
}
