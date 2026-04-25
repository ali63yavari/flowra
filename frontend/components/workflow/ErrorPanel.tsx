"use client";

import { useWorkflowStore } from "@/store/workflowStore";

export default function ErrorPanel() {
  const errors = useWorkflowStore((s) => s.errors);
  const validate = useWorkflowStore((s) => s.validate);
  const selectStep = useWorkflowStore((s) => s.selectStep);

  const blocking = errors.filter((issue) => issue.severity === "error");
  const warnings = errors.filter((issue) => issue.severity === "warning");

  return (
    <section className="rounded border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Validation</p>
          <h2 className="mt-1 text-sm font-semibold text-slate-950">
            {blocking.length} errors, {warnings.length} warnings
          </h2>
        </div>
        <button
          type="button"
          onClick={() => validate()}
          className="rounded border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Check
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto p-4">
        {errors.length === 0 ? (
          <p className="text-sm leading-6 text-slate-500">No validation issues have been reported.</p>
        ) : (
          <div className="space-y-2">
            {errors.map((issue, index) => (
              <button
                key={`${issue.message}-${index}`}
                type="button"
                onClick={() => issue.stepId && selectStep(issue.stepId)}
                className="block w-full rounded border border-slate-200 p-3 text-left hover:bg-slate-50"
              >
                <span
                  className={
                    issue.severity === "error"
                      ? "text-xs font-semibold uppercase tracking-wide text-red-700"
                      : "text-xs font-semibold uppercase tracking-wide text-amber-700"
                  }
                >
                  {issue.severity}
                </span>
                <span className="mt-1 block text-sm text-slate-800">{issue.message}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
