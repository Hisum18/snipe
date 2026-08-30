import "server-only";

/**
 * Discord webhook URL validation. A Discord webhook URL is another server-side
 * fetch sink, so before we ever POST to one we verify the host is Discord's and
 * the path is the webhook path. This blocks users from pointing "Discord
 * delivery" at an internal address (SSRF).
 */

const ALLOWED_HOSTS = new Set([
  "discord.com",
  "discordapp.com",
  "canary.discord.com",
  "ptb.discord.com",
]);

export function isValidDiscordWebhookUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (!ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) return false;
  // Path is /api/webhooks/{id}/{token} (optionally version-prefixed).
  return /^\/api(?:\/v\d+)?\/webhooks\/\d+\/[\w-]+$/.test(parsed.pathname);
}

/** Send a message to a validated Discord webhook. Re-validates defensively. */
export async function sendDiscord(
  webhookUrl: string,
  content: string,
): Promise<void> {
  if (!isValidDiscordWebhookUrl(webhookUrl)) {
    throw new Error("Refusing to POST to a non-Discord webhook URL");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    await fetch(webhookUrl, {
      method: "POST",
      redirect: "error",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 2000) }),
    });
  } finally {
    clearTimeout(timeout);
  }
}
