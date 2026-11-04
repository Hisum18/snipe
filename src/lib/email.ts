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
<html><body style="font-family:system-ui,sans-serif;background:#EEEAE1;color:#202124;padding:32px">
  <div style="max-width:480px;margin:0 auto;background:#F8F6F1;border:1px solid #DDD9CF;border-radius:12px;padding:32px">
    <p style="margin:0 0 20px;font-size:17px;font-weight:700;letter-spacing:-0.01em;color:#C83A35">Snipe</p>
    <h1 style="font-size:20px;margin:0 0 12px;color:#202124">Sign in to Snipe</h1>
    <p style="color:#66645E;line-height:1.5">Click the button below to sign in. This link expires in 15 minutes and can be used once.</p>
    <p style="margin:24px 0">
      <a href="${safeUrl}" style="display:inline-block;background:#C83A35;color:#F8F6F1;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Sign in to Snipe</a>
    </p>
    <p style="color:#85837D;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
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

function actionEmail(heading: string, body: string, cta: string, url: string): {
  html: string;
  text: string;
} {
  const safeUrl = escapeAttr(url);
  const html = `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;background:#EEEAE1;color:#202124;padding:32px">
  <div style="max-width:480px;margin:0 auto;background:#F8F6F1;border:1px solid #DDD9CF;border-radius:12px;padding:32px">
    <p style="margin:0 0 20px;font-size:17px;font-weight:700;letter-spacing:-0.01em;color:#C83A35">Snipe</p>
    <h1 style="font-size:20px;margin:0 0 12px;color:#202124">${escapeHtml(heading)}</h1>
    <p style="color:#66645E;line-height:1.5">${escapeHtml(body)}</p>
    <p style="margin:24px 0">
      <a href="${safeUrl}" style="display:inline-block;background:#C83A35;color:#F8F6F1;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${escapeHtml(cta)}</a>
    </p>
    <p style="color:#85837D;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
  </div>
</body></html>`;
  const text = `${heading}\n\n${body}\n\n${cta}: ${url}\n\nIf you didn't request this, ignore this email.`;
  return { html, text };
}

/** Confirm ownership of an email address before it can receive job alerts. */
export async function sendVerifyEmail(to: string, url: string): Promise<void> {
  const { html, text } = actionEmail(
    "Verify your email",
    "Confirm your email to finish setting up Snipe and start receiving job alerts. This link expires in 24 hours.",
    "Verify email",
    url,
  );
  await sendEmail({ to, subject: "Verify your email for Snipe", html, text });
}

/** Reset-password link. */
export async function sendResetEmail(to: string, url: string): Promise<void> {
  const { html, text } = actionEmail(
    "Reset your password",
    "Click below to choose a new password. This link expires in 1 hour and can be used once.",
    "Reset password",
    url,
  );
  await sendEmail({ to, subject: "Reset your Snipe password", html, text });
}

/**
 * Sent when someone tries to sign up with an already-registered email, so the
 * signup API can return an identical response for new and existing emails
 * (no account-existence enumeration).
 */
export async function sendExistingAccountEmail(
  to: string,
  signInUrl: string,
): Promise<void> {
  const { html, text } = actionEmail(
    "You already have a Snipe account",
    "Someone tried to sign up with this email, but an account already exists. If it was you, just sign in — no need to sign up again.",
    "Sign in",
    signInUrl,
  );
  await sendEmail({ to, subject: "You already have a Snipe account", html, text });
}

/**
 * Sent the moment a subscription's payment first fails (past_due/unpaid).
 * Tracking and notifications are paused at the same time this goes out — the
 * account can still sign in, but has nothing tracked until the card is fixed.
 */
export async function sendPaymentFailedEmail(to: string, billingUrl: string): Promise<void> {
  const { html, text } = actionEmail(
    "We couldn't process your payment",
    "Your card was declined, so your subscription payment failed. Your alerts are paused and no companies are being tracked until this is fixed — update your payment method to pick up right where you left off. You won't be charged again on the old card.",
    "Update payment method",
    billingUrl,
  );
  await sendEmail({ to, subject: "Action needed: your Snipe payment failed", html, text });
}

/** Sent once a previously-failed subscription payment recovers. */
export async function sendPaymentRecoveredEmail(to: string, dashboardUrl: string): Promise<void> {
  const { html, text } = actionEmail(
    "You're all set",
    "Your payment went through and your Snipe alerts are back on.",
    "Go to dashboard",
    dashboardUrl,
  );
  await sendEmail({ to, subject: "Your Snipe payment succeeded — alerts are back on", html, text });
}

/** Placeholder demonstrating escaped ATS content in job alert emails. */
export function renderJobLine(title: string, company: string, location: string | null): string {
  const parts = [escapeHtml(title), "—", escapeHtml(company)];
  if (location) parts.push(`(${escapeHtml(location)})`);
  return parts.join(" ");
}
