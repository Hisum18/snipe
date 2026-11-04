import { redirect } from "next/navigation";

import { FaqAccordion, type FaqItem } from "@/components/help/faq-accordion";
import { HelpCircle, Mail } from "@/components/icons";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const FAQ: readonly FaqItem[] = [
  {
    question: "How does Snipe find new jobs so fast?",
    answer:
      "We poll the applicant tracking system (Greenhouse, Lever, or Ashby) a company's careers page actually runs on, directly — as often as once a minute on Max. That's the same data source their own careers page reads from, so you see a new posting as soon as it exists, not after an aggregator gets around to indexing it.",
  },
  {
    question: "What's the difference between the plans?",
    answer:
      "Free tracks up to 3 companies with a daily digest email. Pro tracks up to 25 companies with instant alerts over email or Discord and 5-minute polling. Max tracks unlimited companies with 1-minute polling, SMS alerts, cross-company keyword profiles, and full job history export. See /pricing for exact numbers.",
  },
  {
    question: "How do I upgrade, downgrade, or cancel?",
    answer:
      "Open Billing & plan and choose Manage billing. It opens Snipe's billing page in a new tab, where you can change plans, update your card, or cancel; payments themselves are processed securely by Stripe. Cancelling keeps your current access until the end of the period you already paid for, then falls back to Free (nothing is deleted).",
  },
  {
    question: "What happens if a payment fails?",
    answer:
      "You can still sign in, but tracking pauses and no alerts go out until it's fixed — we email you right when this happens. Update your card from Billing & plan; the very next charge attempt uses the new card, never the one that failed, and everything picks back up automatically once it succeeds.",
  },
  {
    question: "Can I delete my account and data?",
    answer:
      "Yes — Settings → Danger zone. It's a real, immediate deletion: your watches, alert profiles, notification history, and billing link are all removed, and any active subscription is cancelled at the same time.",
  },
];

export default async function HelpPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="animate-enter mb-8">
        <p className="mt-1 text-sm text-neutral-400">Common questions, and how to reach us.</p>
      </div>

      <div className="space-y-6">
        <section
          className="card-glass animate-enter rounded-2xl p-6"
          style={{ animationDelay: "40ms" }}
        >
          <SectionHeading icon={HelpCircle} title="Frequently asked" />
          <div className="mt-2">
            <FaqAccordion items={FAQ} />
          </div>
        </section>

        <section
          className="card-glass animate-enter rounded-2xl p-6"
          style={{ animationDelay: "100ms" }}
        >
          <SectionHeading icon={Mail} title="Still stuck?" />
          <p className="mt-3 text-sm text-neutral-400">
            Email us and we&apos;ll get back to you.
          </p>
          <a
            href="mailto:support@snipe.local"
            className="mt-3 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-normal text-accent-foreground hover:bg-accent/90"
          >
            support@snipe.local
          </a>
        </section>
      </div>
    </main>
  );
}
