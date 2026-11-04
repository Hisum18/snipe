import { Check, Plus } from "@/components/icons";
import { GoogleLogo, MetaLogo, MicrosoftLogo } from "@/components/hero/brand-logos";
import { DashboardMock } from "@/components/hero/dashboard-mock";
import {
  DiscordNotification,
  EmailNotification,
  SmsNotification,
} from "@/components/hero/notification-stack";

const TRACKED = [
  { Logo: GoogleLogo, name: "Google" },
  { Logo: MicrosoftLogo, name: "Microsoft" },
  { Logo: MetaLogo, name: "Meta" },
];

/** Step 1 — adding Google/Microsoft/Meta as tracked companies. */
export function TrackCompaniesVisual() {
  return (
    <div className="card-glass w-full max-w-sm rounded-2xl bg-surface p-5">
      <p className="mb-3 font-mono text-[10px] font-normal uppercase tracking-wider text-neutral-500">
        Track companies
      </p>
      <div className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 py-2">
        <Plus className="h-3.5 w-3.5 text-neutral-500" />
        <span className="text-sm text-neutral-400">Add a company…</span>
      </div>
      <div className="mt-3 space-y-2">
        {TRACKED.map(({ Logo, name }) => (
          <div
            key={name}
            className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] px-3 py-2"
          >
            <Logo className="h-5 w-5" />
            <span className="flex-1 text-sm font-normal">{name}</span>
            <Check className="h-4 w-4 shrink-0 text-brand" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Step 2 — Snipe's dashboard detecting a new posting (reuses the hero mock). */
export function DetectOpportunityVisual() {
  return <DashboardMock className="max-w-full" />;
}

/** Step 3 — the alert arriving across Discord, SMS, and email. */
export function GetNotifiedVisual() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-2.5">
      <DiscordNotification className="w-full" />
      <SmsNotification className="w-full" />
      <EmailNotification className="w-full" />
    </div>
  );
}
