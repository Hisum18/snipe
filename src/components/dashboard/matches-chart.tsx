"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

export interface ChartPoint {
  /** Short display date, e.g. "Oct 21" (formatted on the server). */
  label: string;
  value: number;
}

/** Clean y-axis ticks: a 1/2/5×10ⁿ step, as few ticks as cover the max. */
function yTicks(max: number): number[] {
  const raw = Math.max(max, 1) / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  const step = Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow);
  const count = max === 0 ? 4 : Math.max(1, Math.ceil(max / step));
  return Array.from({ length: count + 1 }, (_, i) => i * step);
}

/**
 * Single-series area chart of matches per day: a brand-colored line with a
 * ~10% wash, hairline solid gridlines, an end-point marker with its value,
 * and a crosshair tooltip on hover or keyboard focus (←/→). An sr-only table
 * carries every value for screen readers.
 */
export function MatchesChart({ data }: { data: ChartPoint[] }) {
  const [active, setActive] = useState<number | null>(null);

  const n = data.length;
  const ticks = yTicks(Math.max(0, ...data.map((d) => d.value)));
  const yMax = ticks[ticks.length - 1]!;
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const y = (v: number) => 100 - (v / yMax) * 100;

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.value)}`).join(" ");
  const area = `M${x(0)},100 ${data.map((d, i) => `L${x(i)},${y(d.value)}`).join(" ")} L${x(n - 1)},100 Z`;
  const allZero = data.every((d) => d.value === 0);
  const last = n - 1;

  function indexAt(clientX: number, el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    return Math.min(last, Math.max(0, Math.round(ratio * last)));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const cur = active ?? last;
    const next =
      e.key === "ArrowLeft" ? cur - 1
      : e.key === "ArrowRight" ? cur + 1
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    setActive(Math.min(last, Math.max(0, next)));
  }

  const shown = active ?? null;
  const point = shown === null ? null : data[shown]!;

  return (
    <div>
      <div className="grid grid-cols-[auto_1fr] gap-x-3">
        {/* Y-axis */}
        <div className="relative h-52 w-7" aria-hidden="true">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 translate-y-1/2 text-[11px] tabular-nums text-neutral-500"
              style={{ bottom: `${(t / yMax) * 100}%` }}
            >
              {t}
            </span>
          ))}
        </div>

        {/* Plot */}
        <div
          role="group"
          tabIndex={0}
          aria-label="Matches per day for the last 14 days. Use the left and right arrow keys to read each day."
          onKeyDown={onKeyDown}
          onFocus={() => setActive((a) => a ?? last)}
          onBlur={() => setActive(null)}
          onPointerMove={(e) => setActive(indexAt(e.clientX, e.currentTarget))}
          onPointerLeave={() => setActive(null)}
          className="relative h-52 rounded-sm outline-offset-4"
        >
          {ticks.map((t) => (
            <div
              key={t}
              aria-hidden="true"
              className="absolute inset-x-0 h-px bg-border"
              style={{ bottom: `${(t / yMax) * 100}%` }}
            />
          ))}

          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
          >
            <path d={area} className="fill-brand/10" />
            <path
              d={line}
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className="stroke-brand"
            />
          </svg>

          {/* End marker + direct label (hidden while the tooltip shows) */}
          {!allZero && shown === null && (
            <>
              <span
                aria-hidden="true"
                className="absolute size-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-brand ring-2 ring-surface"
                style={{ left: `${x(last)}%`, bottom: `${100 - y(data[last]!.value)}%` }}
              />
              <span
                aria-hidden="true"
                className="absolute -translate-x-full -translate-y-full pb-1.5 pr-1.5 text-xs font-medium tabular-nums"
                style={{ left: `${x(last)}%`, top: `${y(data[last]!.value)}%` }}
              >
                {data[last]!.value}
              </span>
            </>
          )}

          {/* Crosshair + active marker + tooltip */}
          {point && shown !== null && (
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-px bg-brand/40"
                style={{ left: `${x(shown)}%` }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-brand ring-2 ring-surface"
                style={{ left: `${x(shown)}%`, bottom: `${100 - y(point.value)}%` }}
              />
              <div
                aria-hidden="true"
                className={cn(
                  "inverse pointer-events-none absolute top-0 z-10 rounded-lg border border-white/[0.08] bg-black px-3 py-2 shadow-overlay",
                  x(shown) < 15 ? "translate-x-2" : x(shown) > 85 ? "-translate-x-[calc(100%+0.5rem)]" : "-translate-x-1/2",
                )}
                style={{ left: `${x(shown)}%` }}
              >
                <p className="text-sm font-semibold tabular-nums">
                  {point.value} {point.value === 1 ? "match" : "matches"}
                </p>
                <p className="text-xs text-neutral-500">{point.label}</p>
              </div>
            </>
          )}

          {allZero && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-neutral-500">
              No matches in the last 14 days yet.
            </p>
          )}
        </div>

        {/* X-axis */}
        <div />
        <div className="relative mt-2 h-4" aria-hidden="true">
          {data.map((d, i) =>
            i % 2 === 0 || i === last ? (
              <span
                key={d.label}
                className={cn(
                  "absolute -translate-x-1/2 whitespace-nowrap text-[11px] text-neutral-500",
                  i % 4 !== 0 && i !== last && "hidden sm:block",
                  i === last && "-translate-x-full",
                  i === 0 && "translate-x-0",
                )}
                style={{ left: `${x(i)}%` }}
              >
                {d.label}
              </span>
            ) : null,
          )}
        </div>
      </div>

      {/* Screen-reader readout of the focused day, and the full table. */}
      <p className="sr-only" aria-live="polite">
        {point ? `${point.label}: ${point.value} ${point.value === 1 ? "match" : "matches"}` : ""}
      </p>
      <table className="sr-only">
        <caption>Matches per day, last 14 days</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Matches</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.label}</td>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
