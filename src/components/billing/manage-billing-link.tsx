/**
 * Opens Snipe's own billing page (/billing/manage — update card, change or
 * cancel plan, receipts) in a new tab. `section` jumps to part of it.
 */
export function ManageBillingLink({
  label,
  variant = "link",
  section,
}: {
  label: string;
  variant?: "link" | "button";
  section?: "payment-method";
}) {
  return (
    <a
      href={section ? `/billing/manage#${section}` : "/billing/manage"}
      target="_blank"
      rel="noopener"
      className={
        variant === "button"
          ? "rounded-lg bg-accent px-4 py-2 text-sm font-normal text-accent-foreground hover:bg-accent/90"
          : "text-xs text-neutral-400 hover:text-brand-text hover:underline"
      }
    >
      {label}
    </a>
  );
}
