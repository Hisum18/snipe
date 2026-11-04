import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { companies, watches } from "@/db/schema";
import { AddCompany } from "@/components/dashboard/add-company";
import { CompaniesDirectory } from "@/components/dashboard/companies-directory";
import { Search } from "@/components/icons";
import { SectionHeading } from "@/components/ui/section-heading";
import { CURATED_COMPANIES } from "@/lib/curated-companies";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const watchedRows = await db
    .select({ provider: companies.atsProvider, slug: companies.atsSlug })
    .from(watches)
    .innerJoin(companies, eq(companies.id, watches.companyId))
    .where(eq(watches.userId, user.id));

  const watchedKeys = new Set(watchedRows.map((r) => `${r.provider}:${r.slug}`));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="animate-enter mb-8">
        <p className="mt-1 text-sm text-neutral-400">
          Browse and watch companies with one click, or paste a careers URL for anything not
          listed here.
        </p>
      </div>

      <div className="space-y-6">
        <div
          className="card-glass animate-enter rounded-2xl p-6"
          style={{ animationDelay: "40ms" }}
        >
          <CompaniesDirectory companies={CURATED_COMPANIES} watchedKeys={[...watchedKeys]} />
        </div>

        <section
          className="card-glass animate-enter rounded-2xl p-6"
          style={{ animationDelay: "100ms" }}
        >
          <SectionHeading icon={Search} title="Not listed? Paste a URL" />
          <div className="mt-4">
            <AddCompany />
          </div>
        </section>
      </div>
    </main>
  );
}
