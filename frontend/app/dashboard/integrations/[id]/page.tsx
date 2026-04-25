"use client";

import FlowBuilder from "@/components/flow/FlowBuilder";
import ErrorPanel from "@/components/workflow/ErrorPanel";
import NodeEditor from "@/components/workflow/NodeEditor";
import NodePalette from "@/components/workflow/NodePalette";
import RunPanel from "@/components/workflow/RunPanel";
import WorkflowCanvas from "@/components/workflow/WorkflowCanvas";
import { useWorkflowStore } from "@/store/workflowStore";

export default function BuilderPage() {
  const activeCollection = useWorkflowStore((s) =>
    s.activeCollectionId ? s.collections[s.activeCollectionId] : undefined
  );
  const activeWorkflow = useWorkflowStore((s) =>
    s.activeWorkflowId ? s.workflows[s.activeWorkflowId] : undefined
  );
  const errors = useWorkflowStore((s) => s.errors);
  const renameWorkflow = useWorkflowStore((s) => s.renameWorkflow);
  const updateWorkflowDescription = useWorkflowStore((s) => s.updateWorkflowDescription);
  const createWorkflow = useWorkflowStore((s) => s.createWorkflow);

  const blockingErrors = errors.filter((issue) => issue.severity === "error").length;
  const warnings = errors.filter((issue) => issue.severity === "warning").length;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_380px]">
        <div className="min-h-[360px] lg:min-h-screen">
          <NodePalette />
        </div>

        <section className="min-w-0 space-y-4 p-4">
          <div className="rounded border border-slate-200 bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {activeCollection?.name ?? "No collection selected"}
            </p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                {activeWorkflow ? (
                  <>
                    <input
                      value={activeWorkflow.name}
                      onChange={(event) => renameWorkflow(activeWorkflow.id, event.target.value)}
                      className="w-full rounded border border-transparent bg-transparent text-xl font-semibold text-slate-950 outline-none hover:border-slate-200 focus:border-blue-300 focus:bg-white focus:px-2"
                    />
                    <input
                      value={activeWorkflow.description}
                      onChange={(event) => updateWorkflowDescription(activeWorkflow.id, event.target.value)}
                      placeholder="Add a short workflow description"
                      className="mt-1 w-full rounded border border-transparent bg-transparent text-sm leading-6 text-slate-600 outline-none hover:border-slate-200 focus:border-blue-300 focus:bg-white focus:px-2"
                    />
                  </>
                ) : (
                  <>
                    <h1 className="text-xl font-semibold text-slate-950">No workflow selected</h1>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Choose a workflow from the sidebar or create a new one in the active collection.
                    </p>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {activeWorkflow ? (
                  <>
                    <span className="rounded bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {activeWorkflow.workflow.steps.length} steps
                    </span>
                    <span className="rounded bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                      {blockingErrors} errors
                    </span>
                    <span className="rounded bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      {warnings} warnings
                    </span>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => createWorkflow(activeCollection?.id)}
                    className="rounded bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    New workflow
                  </button>
                )}
              </div>
            </div>
          </div>

          <FlowBuilder />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <WorkflowCanvas />
            <ErrorPanel />
          </div>

          <RunPanel />
        </section>

        <div className="min-h-[640px]">
          <NodeEditor />
        </div>
      </div>
    </main>
  );
}
