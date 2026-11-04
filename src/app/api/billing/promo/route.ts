import { priceIdFor } from "@/config/plans";
import { enforceRateLimit, json, requireApiUser } from "@/lib/api";
import { ensureCustomer, findPromotionCode } from "@/lib/billing";
import { writeByUser } from "@/lib/ratelimit";
import { getStripe } from "@/lib/stripe";
import { promoPreviewSchema } from "@/lib/validation";

export const runtime = "nodejs";

// POST /api/billing/promo — check a promotion code against a plan and return
// what the first payment would be. Stripe's own invoice preview does the math
// (and the eligibility checks), so the total shown is the total charged.
// /subscribe re-validates the code; nothing here is trusted later.
export async function POST(req: Request) {
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
  const parsed = promoPreviewSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Enter a valid code." }, 400);
  const { plan, interval, code } = parsed.data;

  const promo = await findPromotionCode(code);
  if (!promo) return json({ error: "That promotion code isn't valid." }, 404);

  const customerId = await ensureCustomer(user);
  try {
    const preview = await getStripe().invoices.createPreview({
      customer: customerId,
      subscription_details: { items: [{ price: priceIdFor(plan, interval) }] },
      discounts: [{ promotion_code: promo.id }],
    });
    const discount = (preview.total_discount_amounts ?? []).reduce((sum, d) => sum + d.amount, 0);
    if (discount <= 0) {
      return json({ error: "That code doesn't apply to this plan." }, 400);
    }

    const coupon = promo.coupon;
    const duration =
      coupon.duration === "forever"
        ? "on every payment"
        : coupon.duration === "repeating" && coupon.duration_in_months
          ? `for ${coupon.duration_in_months} month${coupon.duration_in_months === 1 ? "" : "s"}`
          : "on your first payment";

    return json({
      code: promo.code,
      discount,
      totalDue: preview.amount_due,
      currency: preview.currency,
      duration,
    });
  } catch {
    return json({ error: "That code can't be used for this plan." }, 400);
  }
}
