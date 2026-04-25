"use client";

import FlowBuilder from "@/components/flow/FlowBuilder";
import ErrorPanel from "@/components/workflow/ErrorPanel";
import NodeEditor from "@/components/workflow/NodeEditor";
import NodePalette from "@/components/workflow/NodePalette";
import RunPanel from "@/components/workflow/RunPanel";
import WorkflowCanvas from "@/components/workflow/WorkflowCanvas";

export default function BuilderPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_380px]">
        <div className="min-h-[360px] lg:min-h-screen">
          <NodePalette />
        </div>

        <section className="min-w-0 space-y-4 p-4">
          <div className="rounded border border-slate-200 bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Integration draft</p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-slate-950">Web-to-API workflow</h1>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Build a deterministic step list, preview the generated graph, then execute the DSL.
                </p>
              </div>
              <span className="rounded bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Linear source of truth
              </span>
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
