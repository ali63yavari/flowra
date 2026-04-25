"use client";

import { useState } from "react";
import FlowBuilder from "@/components/flow/FlowBuilder";
import { IconButton } from "@/components/ui/IconButton";
import NodeEditor from "@/components/workflow/NodeEditor";
import NodePalette from "@/components/workflow/NodePalette";
import RunPanel from "@/components/workflow/RunPanel";
import WorkflowCanvas from "@/components/workflow/WorkflowCanvas";
import { useWorkflowStore } from "@/store/workflowStore";

export default function BuilderPage() {
  const [sidebarMode, setSidebarMode] = useState<"open" | "rail" | "hidden">("open");
  const [sidebarWidth, setSidebarWidth] = useState(280);
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
  const actualSidebarWidth = sidebarMode === "hidden" ? 0 : sidebarMode === "rail" ? 56 : sidebarWidth;

  const beginResize = () => {
    const handleMove = (event: MouseEvent) => {
      setSidebarWidth(Math.min(420, Math.max(240, event.clientX)));
    };
    const handleUp = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  return (
    <main className="h-screen overflow-hidden bg-slate-100 text-slate-950">
      <div
        className="grid h-screen"
        style={{
          gridTemplateColumns: `${actualSidebarWidth}px minmax(0, 1fr) 380px`,
          gridTemplateRows: "56px minmax(0, 1fr)",
        }}
      >
        <div className="col-span-3 border-b border-slate-200 bg-white px-4">
          <div className="flex h-full items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <IconButton
                label="Hide sidebar"
                icon="chevronRight"
                onClick={() => setSidebarMode((mode) => (mode === "hidden" ? "open" : "hidden"))}
              />
              <IconButton
                label="Toggle narrow sidebar"
                icon="chevronDown"
                onClick={() => setSidebarMode((mode) => (mode === "rail" ? "open" : "rail"))}
              />
              <div className="ml-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tenant</p>
                <p className="text-sm font-semibold text-slate-950">Acme Automation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                Environment: Production
              </button>
              <IconButton label="Tenant memory and variables" icon="edit" onClick={() => undefined} />
              <IconButton label="Notifications" icon="check" onClick={() => undefined} />
              <button className="flex h-8 w-8 items-center justify-center rounded bg-slate-950 text-xs font-semibold text-white">
                AR
              </button>
            </div>
          </div>
        </div>

        <div className="relative min-h-0 overflow-hidden">
          {sidebarMode !== "hidden" && <NodePalette collapsed={sidebarMode === "rail"} />}
          {sidebarMode === "open" && (
            <button
              type="button"
              aria-label="Resize sidebar"
              onMouseDown={beginResize}
              className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-300"
            />
          )}
        </div>

        <section className="scrollbar-auto-hide min-h-0 min-w-0 space-y-4 overflow-y-auto p-4">
          <header className="relative overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-blue-500" />
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div className="min-w-0 flex-1">
                {activeWorkflow ? (
                  <>
                    <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                      <span className="rounded bg-slate-100 px-2 py-1 font-medium text-slate-700">
                        {activeCollection?.name ?? "No collection selected"}
                      </span>
                      <span aria-hidden="true">/</span>
                      <span className="rounded bg-blue-50 px-2 py-1 font-semibold text-blue-700">Workflow</span>
                    </div>
                    <input
                      value={activeWorkflow.name}
                      onChange={(event) => renameWorkflow(activeWorkflow.id, event.target.value)}
                      className="mt-3 w-full rounded border border-transparent bg-transparent text-2xl font-semibold text-slate-950 outline-none hover:border-slate-200 focus:border-blue-300 focus:bg-white focus:px-2"
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
                  <IconButton
                    label="Create workflow"
                    icon="plus"
                    tone="primary"
                    onClick={() => createWorkflow(activeCollection?.id)}
                  />
                )}
              </div>
            </div>
          </header>

          <div className="grid gap-4 xl:grid-cols-[minmax(420px,1.25fr)_minmax(300px,0.75fr)]">
            <WorkflowCanvas />
            <FlowBuilder />
          </div>

          <RunPanel />
        </section>

        <div className="min-h-0 overflow-hidden">
          <NodeEditor />
        </div>
      </div>
    </main>
  );
}
