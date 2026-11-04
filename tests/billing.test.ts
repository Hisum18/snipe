import { beforeEach, describe, expect, it, vi } from "vitest";

import { findLiveSubscription, stripeErrorMessage, verifiedSetupPaymentMethod } from "@/lib/billing";
import { promoPreviewSchema, subscribeSchema } from "@/lib/validation";

/**
 * Guards behind Snipe's own checkout (/api/billing/*): a confirmed card is
 * only used if it belongs to the session's customer, and "already
 * subscribed" means the same statuses the original Stripe Checkout guard
 * used. Stripe and the DB are stubbed — no network.
 */
const stripe = {
  setupIntents: { retrieve: vi.fn() },
  subscriptions: { list: vi.fn() },
};
vi.mock("@/lib/stripe", () => ({ getStripe: () => stripe }));
vi.mock("@/db", () => ({ db: {} }));

beforeEach(() => {
  stripe.setupIntents.retrieve.mockReset();
  stripe.subscriptions.list.mockReset();
});

describe("verifiedSetupPaymentMethod", () => {
  it("returns the card from a succeeded SetupIntent of this customer", async () => {
    stripe.setupIntents.retrieve.mockResolvedValue({
      customer: "cus_me",
      status: "succeeded",
      payment_method: "pm_1",
    });
    await expect(verifiedSetupPaymentMethod("seti_1", "cus_me")).resolves.toBe("pm_1");
  });

  it("accepts expanded customer / payment method objects", async () => {
    stripe.setupIntents.retrieve.mockResolvedValue({
      customer: { id: "cus_me" },
      status: "succeeded",
      payment_method: { id: "pm_2" },
    });
    await expect(verifiedSetupPaymentMethod("seti_1", "cus_me")).resolves.toBe("pm_2");
  });

  it("refuses another customer's SetupIntent", async () => {
    stripe.setupIntents.retrieve.mockResolvedValue({
      customer: "cus_someone_else",
      status: "succeeded",
      payment_method: "pm_1",
    });
    await expect(verifiedSetupPaymentMethod("seti_1", "cus_me")).resolves.toBeNull();
  });

  it("refuses a SetupIntent that hasn't succeeded", async () => {
    stripe.setupIntents.retrieve.mockResolvedValue({
      customer: "cus_me",
      status: "requires_payment_method",
      payment_method: null,
    });
    await expect(verifiedSetupPaymentMethod("seti_1", "cus_me")).resolves.toBeNull();
  });
});

describe("findLiveSubscription", () => {
  it("counts active, trialing and past_due as live", async () => {
    for (const status of ["active", "trialing", "past_due"]) {
      stripe.subscriptions.list.mockResolvedValue({ data: [{ id: "sub_1", status }] });
      await expect(findLiveSubscription("cus_me")).resolves.toMatchObject({ id: "sub_1" });
    }
  });

  it("ignores ended or never-paid subscriptions", async () => {
    stripe.subscriptions.list.mockResolvedValue({
      data: ["canceled", "incomplete", "incomplete_expired", "unpaid"].map((status, i) => ({
        id: `sub_${i}`,
        status,
      })),
    });
    await expect(findLiveSubscription("cus_me")).resolves.toBeNull();
  });
});

describe("stripeErrorMessage", () => {
  it("passes card errors through (they're written for customers)", () => {
    expect(stripeErrorMessage({ type: "StripeCardError", message: "Your card was declined." }, "x")).toBe(
      "Your card was declined.",
    );
  });

  it("hides every other error behind the fallback", () => {
    expect(
      stripeErrorMessage({ type: "StripeInvalidRequestError", message: "No such price: price_123" }, "Try again."),
    ).toBe("Try again.");
  });
});

describe("billing request schemas", () => {
  it("only accepts SetupIntent-shaped ids", () => {
    const base = { plan: "pro", interval: "monthly" };
    expect(subscribeSchema.safeParse({ ...base, setupIntentId: "seti_123abc" }).success).toBe(true);
    expect(subscribeSchema.safeParse({ ...base, setupIntentId: "pm_123abc" }).success).toBe(false);
    expect(subscribeSchema.safeParse({ ...base, setupIntentId: "seti_1; drop" }).success).toBe(false);
  });

  it("only accepts plain promotion codes", () => {
    const base = { plan: "max", interval: "annual" };
    expect(promoPreviewSchema.safeParse({ ...base, code: "LAUNCH-20" }).success).toBe(true);
    expect(promoPreviewSchema.safeParse({ ...base, code: "has space" }).success).toBe(false);
    expect(promoPreviewSchema.safeParse({ ...base, code: "" }).success).toBe(false);
  });
});
