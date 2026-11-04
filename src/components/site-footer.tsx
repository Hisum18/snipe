import { SnipeLogo } from "@/components/icons";

/**
 * The marketing pages' footer: a deep-carbon band (`.inverse`, so its text
 * reads light in both themes) aligned to the same frame as the navbar.
 */
export function SiteFooter() {
  return (
    <footer className="inverse bg-deep text-sm text-neutral-500">
      <div className="mx-auto flex max-w-content flex-col items-center justify-between gap-3 px-6 py-10 sm:flex-row lg:px-10">
        <span className="flex items-center gap-2">
          <SnipeLogo className="h-5 w-5 text-brand" />© {new Date().getFullYear()} Snipe
        </span>
        <span>Polls public ATS endpoints. Not affiliated with any employer.</span>
      </div>
    </footer>
  );
}
