import type { IconProps } from "@/components/icons";

/**
 * Shared card/section header: icon chip + title + optional count. Was
 * hand-duplicated across dashboard/settings/companies/jobs/help pages;
 * centralized here. The chip is flat (a 1px border, no ring/inset-highlight/
 * bg-tint) per Factory's "no glow" rule — Factory has no "soft glass chip"
 * concept, just a bordered square.
 */
export function SectionHeading({
  icon: Icon,
  title,
  count,
}: {
  icon: (p: IconProps) => React.ReactElement;
  title: string;
  count?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-neutral-200">
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="text-lg font-normal">{title}</h2>
      {count && <span className="text-sm text-neutral-400 tabular">({count})</span>}
    </div>
  );
}
