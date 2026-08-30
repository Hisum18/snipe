import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

export const runtime = "nodejs";

async function unsubscribe(userId: string, token: string): Promise<boolean> {
  if (!userId || !token || !verifyUnsubscribeToken(userId, token)) return false;
  await db
    .update(users)
    .set({ emailNotificationsEnabled: false, updatedAt: new Date() })
    .where(eq(users.id, userId));
  return true;
}

// RFC 8058 one-click unsubscribe (List-Unsubscribe-Post target).
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const ok = await unsubscribe(searchParams.get("u") ?? "", searchParams.get("token") ?? "");
  return new Response(ok ? "Unsubscribed" : "Invalid link", {
    status: ok ? 200 : 400,
  });
}

// Human click-through from the email.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ok = await unsubscribe(searchParams.get("u") ?? "", searchParams.get("token") ?? "");
  const body = ok
    ? "<h1>You're unsubscribed</h1><p>You will no longer receive Snipe job alert emails. You can re-enable them from your dashboard.</p>"
    : "<h1>Invalid link</h1><p>This unsubscribe link is invalid or has expired.</p>";
  return new Response(
    `<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:480px;margin:80px auto;padding:0 24px;color:#111">${body}</body></html>`,
    { status: ok ? 200 : 400, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
