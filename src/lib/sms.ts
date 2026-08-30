import "server-only";

import { getServerEnv } from "@/env";

/**
 * SMS delivery via Twilio. Ships DISABLED — `smsConfigured()` is false unless all
 * three Twilio env vars are present, so Max-tier SMS only activates once a real
 * account is wired. Outbound requests go to a single fixed host (SSRF-safe),
 * with a timeout and no redirect following, matching src/lib/ats.ts discipline.
 */

const TWILIO_HOST = "api.twilio.com";

export function smsConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(
    env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER,
  );
}

/** E.164 phone number check, e.g. +14155551234. */
export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

export async function sendSms(toE164: string, body: string): Promise<void> {
  const env = getServerEnv();
  if (!smsConfigured()) throw new Error("SMS is not configured");
  if (!isValidE164(toE164)) throw new Error("Invalid destination phone number");

  const sid = env.TWILIO_ACCOUNT_SID!;
  const auth = Buffer.from(`${sid}:${env.TWILIO_AUTH_TOKEN!}`).toString("base64");
  const url = `https://${TWILIO_HOST}/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;

  const form = new URLSearchParams({
    To: toE164,
    From: env.TWILIO_FROM_NUMBER!,
    Body: body.slice(0, 640), // ~4 SMS segments max
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      redirect: "error",
      signal: controller.signal,
      headers: {
        authorization: `Basic ${auth}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    if (!res.ok) {
      throw new Error(`Twilio returned ${res.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}
