import { z } from "zod";

/**
 * Shared Zod schemas used at route boundaries. Every request body / query param
 * is parsed through one of these before it touches business logic or the DB.
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(254); // RFC 5321 max

// Keyword filters: a bounded list of short, plain strings. No control chars.
export const keywordFiltersSchema = z
  .array(z.string().trim().min(1).max(80).regex(/^[^\x00-\x1f]*$/))
  .max(25)
  .default([]);

export const locationFilterSchema = z
  .string()
  .trim()
  .max(120)
  .regex(/^[^\x00-\x1f]*$/)
  .optional();

export const magicLinkRequestSchema = z.object({
  email: emailSchema,
  // Optional post-login redirect path. Must be a relative path (no open redirect).
  callbackPath: z
    .string()
    .startsWith("/")
    .max(512)
    .refine((p) => !p.startsWith("//"), "must be a relative path")
    .optional(),
});

export const addWatchSchema = z.object({
  // The pasted careers URL. We never fetch it; we parse provider+slug from it.
  careersUrl: z.string().trim().url().max(2048),
  keywordFilters: keywordFiltersSchema,
  locationFilter: locationFilterSchema,
});

export const updateWatchSchema = z.object({
  keywordFilters: keywordFiltersSchema.optional(),
  locationFilter: locationFilterSchema,
});

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(80).regex(/^[^\x00-\x1f]*$/),
  keywordFilters: keywordFiltersSchema,
  locationFilter: locationFilterSchema,
  crossCompany: z.boolean().default(false),
});

export const checkoutSchema = z.object({
  plan: z.enum(["pro", "max"]),
  interval: z.enum(["monthly", "annual"]),
});

export const discordWebhookSchema = z.object({
  discordWebhookUrl: z.string().trim().url().max(2048).nullable(),
});

export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;
export type AddWatchInput = z.infer<typeof addWatchSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
