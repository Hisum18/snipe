import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";
import { enforceRateLimit, json, requireApiUser } from "@/lib/api";
import { isValidDiscordWebhookUrl } from "@/lib/discord";
import { writeByUser } from "@/lib/ratelimit";

export const runtime = "nodejs";

const settingsSchema = z.object({
  // null clears the webhook; a string must pass the Discord host/path check.
  discordWebhookUrl: z.string().trim().max(2048).nullable().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const limited = await enforceRateLimit(writeByUser(), user.id);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid request" }, 400);

  const updates: {
    discordWebhookUrl?: string | null;
    emailNotificationsEnabled?: boolean;
    updatedAt?: Date;
  } = {};

  if (parsed.data.discordWebhookUrl !== undefined) {
    const url = parsed.data.discordWebhookUrl;
    if (url !== null && !isValidDiscordWebhookUrl(url)) {
      // SSRF guard: only genuine Discord webhook URLs may be stored.
      return json({ error: "That is not a valid Discord webhook URL." }, 422);
    }
    updates.discordWebhookUrl = url;
  }
  if (parsed.data.emailNotificationsEnabled !== undefined) {
    updates.emailNotificationsEnabled = parsed.data.emailNotificationsEnabled;
  }
  if (Object.keys(updates).length === 0) return json({ error: "Nothing to update" }, 400);
  updates.updatedAt = new Date();

  await db.update(users).set(updates).where(eq(users.id, user.id));
  return json({ ok: true });
}
