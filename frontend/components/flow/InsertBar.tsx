"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/IconButton";
import { nodeMeta, stepTypeOrder } from "@/lib/nodeMeta";
import type { StepType } from "@/lib/types";

export default function InsertBar({ onInsert }: { onInsert: (type: StepType) => void }) {
  const [open, setOpen] = useState(false);

  const handleInsert = (type: StepType) => {
    onInsert(type);
    setOpen(false);
  };

  return (
    <div className="relative -ml-8 -mr-5 h-4 opacity-0 transition hover:opacity-100 focus-within:opacity-100 group-hover/step:opacity-100">
      <div className="absolute left-4 right-0 top-1/2 border-t border-dashed border-slate-300" />
      <button
        type="button"
        aria-label="Add step"
        title="Add step"
        onClick={() => setOpen((value) => !value)}
        className="absolute left-0 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 [&_svg]:h-3 [&_svg]:w-3"
      >
        <Icon name="plus" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 w-72 overflow-hidden rounded border border-slate-200 bg-white shadow-lg">
          {stepTypeOrder.map((type) => {
            const meta = nodeMeta[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleInsert(type)}
                className="block w-full px-3 py-2 text-left transition hover:bg-slate-50"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <span className={`h-2 w-2 rounded-full ${meta.accent}`} />
                  {meta.label}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                  {meta.description}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
