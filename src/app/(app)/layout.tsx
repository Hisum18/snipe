import { and, count, desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { companies, notifications, watches } from "@/db/schema";
import { limitsFor } from "@/config/plans";
import { AppShell, type WatchingItem } from "@/components/app-shell/app-shell";
import { getCurrentUser } from "@/lib/auth/session";

// Shared shell for the logged-in app area (Dashboard, Companies, Job history,
// Billing & plan, Settings, Help & Support): sidebar + top bar instead of the
// public site's navbar (which bails out on these routes — see
// components/navbar/navbar.tsx). Public marketing pages are unaffected.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const planLabel = limitsFor(user.plan, user.planStatus).label;

  const [watchingRows, watchingCountRows, newMatchesRows] = await Promise.all([
    // The sidebar's "Watching" list — most recent first.
    db
      .select({
        id: watches.id,
        name: companies.name,
        provider: companies.atsProvider,
        active: watches.active,
      })
      .from(watches)
      .innerJoin(companies, eq(companies.id, watches.companyId))
      .where(eq(watches.userId, user.id))
      .orderBy(desc(watches.createdAt))
      .limit(5),
    db.select({ value: count() }).from(watches).where(eq(watches.userId, user.id)),
    // Distinct jobs matched in the last 24h — drives the top bar's bell dot.
    db
      .select({ value: sql<number>`count(distinct ${notifications.jobId})` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, user.id),
          sql`${notifications.createdAt} >= now() - interval '24 hours'`,
        ),
      ),
  ]);

  const watching: WatchingItem[] = watchingRows;

  return (
    <AppShell
      user={{ name: user.name, email: user.email, planLabel }}
      watching={watching}
      watchingTotal={watchingCountRows[0]?.value ?? 0}
      newMatchesToday={Number(newMatchesRows[0]?.value ?? 0)}
    >
      {children}
    </AppShell>
  );
}
