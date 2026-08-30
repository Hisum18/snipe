/**
 * HTML escaping for untrusted values rendered into email HTML (and anywhere we
 * build markup by hand). React escapes JSX text automatically, but emails are
 * assembled as raw strings, so ATS job titles/locations and user input must be
 * escaped here before interpolation.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape a value for safe inclusion inside an HTML attribute value. */
export function escapeAttr(input: string): string {
  return escapeHtml(input);
}
