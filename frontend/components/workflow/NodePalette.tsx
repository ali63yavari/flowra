"use client";

import { nodeMeta, stepTypeOrder } from "@/lib/nodeMeta";
import { workflowTemplates } from "@/lib/templates";
import { useWorkflowStore } from "@/store/workflowStore";

export default function NodePalette() {
  const addStep = useWorkflowStore((s) => s.addStep);
  const loadTemplate = useWorkflowStore((s) => s.loadTemplate);

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-slate-950 text-white">
      <div className="border-b border-white/10 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Flowra</p>
        <h1 className="mt-1 text-lg font-semibold">Workflow Builder</h1>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <section>
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Steps</h2>
          <div className="mt-3 space-y-2">
            {stepTypeOrder.map((type) => {
              const meta = nodeMeta[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => addStep(type)}
                  className="w-full rounded border border-white/10 bg-white/5 p-3 text-left transition hover:border-blue-300/50 hover:bg-white/10"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span className={`h-2 w-2 rounded-full ${meta.accent}`} />
                    {meta.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-300">{meta.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Templates</h2>
          <div className="mt-3 space-y-2">
            {workflowTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => loadTemplate(template)}
                className="w-full rounded border border-white/10 bg-white/5 p-3 text-left transition hover:border-blue-300/50 hover:bg-white/10"
              >
                <span className="text-sm font-semibold">{template.name}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-300">{template.description}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
