import { describe, expect, it } from "vitest";

import { isValidDiscordWebhookUrl } from "@/lib/discord";

describe("isValidDiscordWebhookUrl", () => {
  it("accepts genuine Discord webhook URLs", () => {
    expect(
      isValidDiscordWebhookUrl("https://discord.com/api/webhooks/123456789/abcDEF-_"),
    ).toBe(true);
    expect(
      isValidDiscordWebhookUrl("https://discordapp.com/api/webhooks/123/token"),
    ).toBe(true);
    expect(
      isValidDiscordWebhookUrl("https://discord.com/api/v10/webhooks/123/token"),
    ).toBe(true);
  });

  it("rejects non-Discord hosts (SSRF guard)", () => {
    expect(isValidDiscordWebhookUrl("https://evil.com/api/webhooks/1/x")).toBe(false);
    expect(
      isValidDiscordWebhookUrl("https://discord.com.evil.com/api/webhooks/1/x"),
    ).toBe(false);
    expect(isValidDiscordWebhookUrl("http://169.254.169.254/api/webhooks/1/x")).toBe(false);
  });

  it("rejects non-webhook paths and non-https", () => {
    expect(isValidDiscordWebhookUrl("https://discord.com/api/users/@me")).toBe(false);
    expect(isValidDiscordWebhookUrl("http://discord.com/api/webhooks/1/x")).toBe(false);
    expect(isValidDiscordWebhookUrl("not a url")).toBe(false);
  });
});
