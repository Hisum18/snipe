import "server-only";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { companies, notifications, seenJobs, users, type User } from "@/db/schema";
import { limitsFor, type Channel, type DeliveryMode } from "@/config/plans";
import { sendDiscord, isValidDiscordWebhookUrl } from "@/lib/discord";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/html";
import { log } from "@/lib/log";
import { sendSms, smsConfigured } from "@/lib/sms";
import { unsubscribeUrl } from "@/lib/unsubscribe";

export interface JobItem {
  jobId: string;
  title: string;
  location: string | null;
  url: string;
  companyName: string;
}

/** Channels this user is BOTH entitled to (by tier) AND has configured. */
export function entitledChannels(user: User): Channel[] {
  const allowed = new Set<Channel>(limitsFor(user.plan, user.planStatus).channels);
  const out: Channel[] = [];
  if (allowed.has("email")) out.push("email");
  if (allowed.has("discord") && user.discordWebhookUrl && isValidDiscordWebhookUrl(user.discordWebhookUrl)) {
    out.push("discord");
  }
  if (allowed.has("sms") && user.phoneVerifiedAt && smsConfigured()) {
    out.push("sms");
  }
  return out;
}

/**
 * Enqueue notification rows for (user, job) recipients. Idempotent via the
 * unique (user_id, job_id, channel) index — duplicate intents are dropped, so
 * a job can never be sent twice on the same channel.
 */
export async function enqueueNotifications(
  recipients: { user: User; jobId: string }[],
): Promise<void> {
  const values: { userId: string; jobId: string; channel: Channel }[] = [];
  for (const { user, jobId } of recipients) {
    for (const channel of entitledChannels(user)) {
      values.push({ userId: user.id, jobId, channel });
    }
  }
  if (values.length === 0) return;
  // Chunk to keep parameter counts sane on large runs.
  for (let i = 0; i < values.length; i += 500) {
    await db
      .insert(notifications)
      .values(values.slice(i, i + 500))
      .onConflictDoNothing();
  }
}

interface PendingRow {
  notifId: string;
  channel: Channel;
  user: User;
  item: JobItem;
}

/**
 * Send all pending (unsent) notifications for users whose plan delivery matches
 * `mode`. Batches per user+channel into a single message, then marks the rows
 * sent. Failed sends leave rows unsent for the next run to retry.
 */
export async function dispatchPending(mode: DeliveryMode, maxRows = 5000): Promise<number> {
  // Delivery mode is derived in SQL (mirrors PLAN_LIMITS: instant = a paid tier
  // that's active/trialing; everything else digests) so we only fetch rows for
  // THIS mode. Ordering by user keeps a user's rows contiguous for batching, and
  // the cap bounds work per run — processed rows are marked sent, so successive
  // cron runs drain any backlog.
  const isInstant = sql`(${users.planStatus} in ('active','trialing') and ${users.plan} in ('pro','max'))`;
  const modeCond = mode === "instant" ? isInstant : sql`not ${isInstant}`;

  const rows = await db
    .select({
      notifId: notifications.id,
      channel: notifications.channel,
      user: users,
      jobId: seenJobs.id,
      title: seenJobs.title,
      location: seenJobs.location,
      url: seenJobs.url,
      companyName: companies.name,
    })
    .from(notifications)
    .innerJoin(users, eq(users.id, notifications.userId))
    .innerJoin(seenJobs, eq(seenJobs.id, notifications.jobId))
    .innerJoin(companies, eq(companies.id, seenJobs.companyId))
    .where(and(isNull(notifications.sentAt), modeCond))
    .orderBy(notifications.userId)
    .limit(maxRows);

  const pending: PendingRow[] = rows.map((r) => ({
    notifId: r.notifId,
    channel: r.channel,
    user: r.user,
    item: {
      jobId: r.jobId,
      title: r.title,
      location: r.location,
      url: r.url,
      companyName: r.companyName,
    },
  }));

  // Group by user, then by channel.
  const byUser = new Map<string, PendingRow[]>();
  for (const row of pending) {
    const list = byUser.get(row.user.id) ?? [];
    list.push(row);
    byUser.set(row.user.id, list);
  }

  let sentCount = 0;
  for (const [, userRows] of byUser) {
    const user = userRows[0]!.user;
    const emailRows = userRows.filter((r) => r.channel === "email");
    const discordRows = userRows.filter((r) => r.channel === "discord");
    const smsRows = userRows.filter((r) => r.channel === "sms");

    sentCount += await deliverChannel("email", user, emailRows);
    sentCount += await deliverChannel("discord", user, discordRows);
    sentCount += await deliverChannel("sms", user, smsRows);
  }
  return sentCount;
}

async function deliverChannel(
  channel: Channel,
  user: User,
  rows: PendingRow[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const ids = rows.map((r) => r.notifId);
  const items = rows.map((r) => r.item);

  try {
    if (channel === "email") {
      // Never send to an unconfirmed address; respect the unsubscribe flag.
      if (!user.emailVerified || !user.emailNotificationsEnabled) {
        await markSent(ids); // suppress + dequeue
        return 0;
      }
      await sendAlertEmail(user, items);
    } else if (channel === "discord") {
      if (!user.discordWebhookUrl || !isValidDiscordWebhookUrl(user.discordWebhookUrl)) {
        await markSent(ids);
        return 0;
      }
      await sendDiscord(user.discordWebhookUrl, buildDiscordMessage(items));
    } else {
      // SMS: deliver only if the user has a verified phone and SMS is configured;
      // otherwise dequeue without sending.
      if (!user.phoneE164 || !user.phoneVerifiedAt || !smsConfigured()) {
        await markSent(ids);
        return 0;
      }
      await sendSms(user.phoneE164, buildSmsMessage(items));
    }
    await markSent(ids);
    return ids.length;
  } catch {
    // Leave rows unsent; the next dispatch run retries them. Log safe fields only.
    log.warn("notification_dispatch_failed", {
      channel,
      userId: user.id,
      count: ids.length,
    });
    return 0;
  }
}

async function markSent(ids: string[]): Promise<void> {
  const now = new Date();
  for (let i = 0; i < ids.length; i += 500) {
    await db
      .update(notifications)
      .set({ sentAt: now })
      .where(
        and(inArray(notifications.id, ids.slice(i, i + 500)), isNull(notifications.sentAt)),
      );
  }
}

async function sendAlertEmail(user: User, items: JobItem[]): Promise<void> {
  const unsub = unsubscribeUrl(user.id);
  const list = items
    .map((it) => {
      const loc = it.location ? ` · ${escapeHtml(it.location)}` : "";
      return `<li style="margin:0 0 10px"><a href="${escapeHtml(it.url)}" style="color:#7aa2ff;text-decoration:none;font-weight:600">${escapeHtml(it.title)}</a><br><span style="color:#aab3c9;font-size:13px">${escapeHtml(it.companyName)}${loc}</span></li>`;
    })
    .join("");

  const count = items.length;
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#0b0f19;color:#e8ecf7;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#131826;border-radius:12px;padding:28px">
    <h1 style="font-size:18px;margin:0 0 16px">${count} new job${count === 1 ? "" : "s"} matched your alerts</h1>
    <ul style="list-style:none;padding:0;margin:0">${list}</ul>
    <p style="color:#6b7488;font-size:12px;margin-top:24px">You're receiving this because you watch these companies on Snipe. <a href="${escapeHtml(unsub)}" style="color:#6b7488">Unsubscribe</a>.</p>
  </div></body></html>`;

  const text =
    `${count} new job${count === 1 ? "" : "s"} matched your alerts:\n\n` +
    items.map((it) => `- ${it.title} — ${it.companyName}${it.location ? ` (${it.location})` : ""}\n  ${it.url}`).join("\n") +
    `\n\nUnsubscribe: ${unsub}`;

  await sendEmail({
    to: user.email,
    subject: `Snipe: ${count} new job${count === 1 ? "" : "s"} matched`,
    html,
    text,
    listUnsubscribeUrl: unsub,
  });
}

function buildDiscordMessage(items: JobItem[]): string {
  const lines = items
    .slice(0, 10)
    .map((it) => `**${it.title}** — ${it.companyName}${it.location ? ` (${it.location})` : ""}\n${it.url}`);
  const extra = items.length > 10 ? `\n…and ${items.length - 10} more` : "";
  return `🎯 ${items.length} new job${items.length === 1 ? "" : "s"} matched your Snipe alerts:\n\n${lines.join("\n\n")}${extra}`;
}

/** Short, single-segment-friendly SMS body: count + the top match + its link. */
function buildSmsMessage(items: JobItem[]): string {
  const n = items.length;
  const top = items[0]!;
  const more = n > 1 ? ` (+${n - 1} more)` : "";
  return `Snipe: ${n} new job${n === 1 ? "" : "s"} matched.${more} ${top.title} — ${top.companyName}: ${top.url}`;
}
