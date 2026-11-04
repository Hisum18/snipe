"use client";

import { useState } from "react";

export interface FaqItem {
  question: string;
  answer: string;
}

export function FaqAccordion({ items }: { items: readonly FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-white/[0.06]">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 py-4 text-left"
            >
              <span className="text-sm font-normal text-white">{item.question}</span>
              <span
                className={`shrink-0 text-neutral-500 transition-transform ${open ? "rotate-45" : ""}`}
                aria-hidden="true"
              >
                +
              </span>
            </button>
            {open && (
              <p className="pb-4 text-sm leading-relaxed text-neutral-400">{item.answer}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
