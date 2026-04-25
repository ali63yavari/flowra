"use client";

import { useState } from "react";
import { nodeMeta, stepTypeOrder } from "@/lib/nodeMeta";
import type { StepType } from "@/lib/types";

export default function InsertBar({ onInsert }: { onInsert: (type: StepType) => void }) {
  const [open, setOpen] = useState(false);

  const handleInsert = (type: StepType) => {
    onInsert(type);
    setOpen(false);
  };

  return (
    <div className="relative py-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-center rounded border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
      >
        Add step
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 overflow-hidden rounded border border-slate-200 bg-white shadow-lg">
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
