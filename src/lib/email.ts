import "server-only";

import { Resend } from "resend";

import { getServerEnv } from "@/env";
import { escapeAttr, escapeHtml } from "./html";

let cached: Resend | null = null;
function client(): Resend {
  if (!cached) cached = new Resend(getServerEnv().RESEND_API_KEY);
  return cached;
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
  // RFC 8058 one-click unsubscribe header target (absolute URL). Omitted for
  // transactional mail like magic links.
  listUnsubscribeUrl?: string;
}

export async function sendEmail(args: SendArgs): Promise<void> {
  const env = getServerEnv();
  const headers: Record<string, string> = {};
  if (args.listUnsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${args.listUnsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  await client().emails.send({
    from: env.EMAIL_FROM,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
    headers,
  });
}

/**
 * Build + send a magic-link sign-in email. The magic URL is never logged. The
 * recipient address is escaped even though it is our own validated value.
 */
export async function sendMagicLinkEmail(
  to: string,
  magicUrl: string,
): Promise<void> {
  const safeUrl = escapeAttr(magicUrl);
  const html = `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;background:#0b0f19;color:#e8ecf7;padding:32px">
  <div style="max-width:480px;margin:0 auto;background:#131826;border-radius:12px;padding:32px">
    <h1 style="font-size:20px;margin:0 0 12px">Sign in to Snipe</h1>
    <p style="color:#aab3c9;line-height:1.5">Click the button below to sign in. This link expires in 15 minutes and can be used once.</p>
    <p style="margin:24px 0">
      <a href="${safeUrl}" style="display:inline-block;background:#5b8cff;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Sign in to Snipe</a>
    </p>
    <p style="color:#6b7488;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
  </div>
</body></html>`;
  const text = `Sign in to Snipe\n\nOpen this link to sign in (expires in 15 minutes, single use):\n${magicUrl}\n\nIf you didn't request this, ignore this email.`;

  await sendEmail({
    to,
    subject: "Your Snipe sign-in link",
    html,
    text,
  });
}

/** Placeholder demonstrating escaped ATS content in job alert emails. */
export function renderJobLine(title: string, company: string, location: string | null): string {
  const parts = [escapeHtml(title), "—", escapeHtml(company)];
  if (location) parts.push(`(${escapeHtml(location)})`);
  return parts.join(" ");
}
