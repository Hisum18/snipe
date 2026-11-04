import { Building, Home, Settings, SnipeLogo, Zap } from "@/components/icons";
import { GoogleLogo, MetaLogo, MicrosoftLogo } from "@/components/hero/brand-logos";

type ActivityRow = {
  Logo: typeof GoogleLogo;
  company: string;
  role: string;
  when: string;
  unread: boolean;
  isNew?: boolean;
};

const ACTIVITY: ActivityRow[] = [
  { Logo: GoogleLogo, company: "Google", role: "Software Engineering Internship", when: "2m ago", unread: true, isNew: true },
  { Logo: MicrosoftLogo, company: "Microsoft", role: "Software Engineering Internship", when: "5m ago", unread: true },
  { Logo: MetaLogo, company: "Meta", role: "Product Intern", when: "12m ago", unread: false },
];

const NAV = [
  { label: "Dashboard", Icon: Home, active: true },
  { label: "Track Companies", Icon: Building, active: false },
];

/**
 * Real-component recreation of the reference image's dashboard panel — not
 * a static screenshot — so it themes correctly and can be animated. Used by
 * both the homepage hero (src/components/hero/hero-intro.tsx) and the How
 * It Works walkthrough. Inner panels use the page background against the
 * card's surface for depth; the brand color marks what's new or active — the
 * selected nav item, the headline stat, NEW badges and unread dots.
 */
export function DashboardMock({ className }: { className?: string }) {
  return (
    <div
      className={`w-[25rem] shrink-0 overflow-hidden rounded-3xl border border-border bg-surface shadow-float sm:w-[30rem] ${className ?? ""}`}
    >
      <div className="flex">
        {/* Nav rail */}
        <div className="hidden w-[9.375rem] shrink-0 flex-col gap-1 border-r border-border bg-black p-3.5 sm:flex">
          <div className="mb-4 flex items-center gap-2 px-1">
            <SnipeLogo className="h-6 w-6 text-brand" />
            <span className="font-display text-sm font-semibold tracking-tight">Snipe</span>
          </div>
          {NAV.map(({ label, Icon, active }) => (
            <div
              key={label}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-normal ${
                active ? "bg-selected font-medium text-selected-foreground" : "text-neutral-500"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </div>
          ))}
        </div>

        {/* Main panel */}
        <div className="min-w-0 flex-1 p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-lg font-medium tracking-tight sm:text-xl">
                Good morning,
              </p>
              <p className="text-sm text-neutral-400">Stay ahead of the competition.</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[0.625rem] uppercase tracking-wider text-neutral-300">
              <span className="live-dot" /> Active
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-black p-3.5">
              <Zap className="h-4 w-4 text-neutral-400" />
              <p className="tabular mt-2 text-2xl font-normal">12</p>
              <p className="text-[0.6875rem] text-neutral-500">Companies tracked</p>
            </div>
            <div className="rounded-xl border border-border bg-black p-3.5">
              <Building className="h-4 w-4 text-brand" />
              <p className="tabular mt-2 text-2xl font-normal text-brand-text">248</p>
              <p className="text-[0.6875rem] text-neutral-500">Opportunities found</p>
            </div>
          </div>

          <p className="mb-2.5 mt-5 font-mono text-[0.625rem] font-normal uppercase tracking-wider text-neutral-500">
            Recent activity
          </p>
          <div className="space-y-2.5">
            {ACTIVITY.map(({ Logo, company, role, when, unread, isNew }) => (
              <div key={company} className="flex items-center gap-3">
                <Logo className="h-6 w-6" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-normal">
                    {company}
                    {isNew && (
                      <span className="rounded-sm bg-accent px-1 py-px font-mono text-[0.5625rem] font-semibold uppercase tracking-wider text-accent-foreground">
                        New
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[0.6875rem] text-neutral-500">{role}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 font-mono text-[0.625rem] text-neutral-500">
                  {when}
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${unread ? "bg-brand" : "bg-transparent"}`}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Settings row, decorative — matches the reference image's nav list */}
      <div className="hidden items-center gap-2 border-t border-border bg-black px-6 py-3 text-[0.6875rem] text-neutral-500 sm:flex">
        <Settings className="h-3 w-3" /> Notifications · Settings · Pricing
      </div>
    </div>
  );
}
