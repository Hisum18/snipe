import { json } from "@/lib/api";
import { isAuthorizedCron } from "@/lib/cron";
import { pollDueCompanies } from "@/lib/poller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Invoked every minute by Vercel Cron (see vercel.json). Requires the cron
// bearer secret; returns 401 otherwise.
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return json({ error: "Unauthorized" }, 401);
  const result = await pollDueCompanies();
  return json({ ok: true, ...result });
}
