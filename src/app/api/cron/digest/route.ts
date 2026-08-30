import { json } from "@/lib/api";
import { isAuthorizedCron } from "@/lib/cron";
import { dispatchPending } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Invoked daily by Vercel Cron. Sends the batched digest of all pending
// notifications for free/digest-tier users.
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return json({ error: "Unauthorized" }, 401);
  const dispatched = await dispatchPending("digest");
  return json({ ok: true, dispatched });
}
