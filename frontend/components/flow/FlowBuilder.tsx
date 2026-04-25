"use client";

import { useMemo, useState } from "react";
import InsertBar from "@/components/flow/InsertBar";
import { nodeMeta } from "@/lib/nodeMeta";
import { summarizeStep } from "@/lib/stepSummary";
import { workflowTemplates } from "@/lib/templates";
import type { StepType } from "@/lib/types";
import { useWorkflowStore } from "@/store/workflowStore";

export default function FlowBuilder() {
  const steps = useWorkflowStore((s) => s.workflow.steps);
  const activeCollectionId = useWorkflowStore((s) => s.activeCollectionId);
  const activeWorkflowId = useWorkflowStore((s) => s.activeWorkflowId);
  const selectedStepId = useWorkflowStore((s) => s.selectedStepId);
  const collapsedStepIds = useWorkflowStore((s) => s.collapsedStepIds);
  const execution = useWorkflowStore((s) => s.execution);
  const errors = useWorkflowStore((s) => s.errors);
  const insertStepAt = useWorkflowStore((s) => s.insertStepAt);
  const moveStep = useWorkflowStore((s) => s.moveStep);
  const selectStep = useWorkflowStore((s) => s.selectStep);
  const deleteStep = useWorkflowStore((s) => s.deleteStep);
  const duplicateStep = useWorkflowStore((s) => s.duplicateStep);
  const toggleCollapsed = useWorkflowStore((s) => s.toggleCollapsed);
  const loadTemplate = useWorkflowStore((s) => s.loadTemplate);
  const createWorkflow = useWorkflowStore((s) => s.createWorkflow);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const issuesByStep = useMemo(
    () =>
      errors.reduce<Record<string, { errors: number; warnings: number }>>((acc, issue) => {
        if (!issue.stepId) return acc;
        const current = acc[issue.stepId] ?? { errors: 0, warnings: 0 };
        if (issue.severity === "error") current.errors += 1;
        else current.warnings += 1;
        acc[issue.stepId] = current;
        return acc;
      }, {}),
    [errors]
  );

  const handleDrop = (index: number) => {
    if (dragIndex === null) return;
    moveStep(dragIndex, index);
    setDragIndex(null);
    setHoverIndex(null);
  };

  if (!activeWorkflowId) {
    return (
      <section className="flex min-h-[420px] flex-col justify-center rounded border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">No active workflow</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-950">Create a workflow</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
          A workflow belongs to a collection and contains a sequence of one or more request steps.
          Create one here or choose an existing workflow from the sidebar.
        </p>
        <button
          type="button"
          onClick={() => createWorkflow(activeCollectionId)}
          className="mt-4 w-fit rounded bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          New workflow
        </button>
      </section>
    );
  }

  if (steps.length === 0) {
    return (
      <section className="flex min-h-[640px] flex-col rounded border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Linear flow</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">Create your first request step</h2>
        </div>
        <div className="grid flex-1 content-start gap-3 p-5 md:grid-cols-2">
          {workflowTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => loadTemplate(template)}
              className="rounded border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
            >
              <span className="text-sm font-semibold text-slate-950">{template.name}</span>
              <span className="mt-1 block text-sm leading-6 text-slate-600">{template.description}</span>
              <span className="mt-3 block text-xs font-medium text-blue-700">
                Use {template.steps.length} step template
              </span>
            </button>
          ))}
        </div>
        <div className="border-t border-slate-200 p-5">
          <InsertBar onInsert={(type) => insertStepAt(0, type)} />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Linear flow</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">{steps.length} configured steps</h2>
        </div>
        <button
          type="button"
          onClick={() => insertStepAt(steps.length, "http_request")}
          className="rounded bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add HTTP request
        </button>
      </div>

      <div className="p-5">
        {steps.map((step, index) => {
          const meta = nodeMeta[step.type];
          const isSelected = selectedStepId === step.id;
          const isCollapsed = collapsedStepIds.includes(step.id);
          const issueCounts = issuesByStep[step.id];
          const isActive = execution.activeStepId === step.id;
          const isFailed = execution.failedStepId === step.id;

          return (
            <div key={step.id}>
              <InsertBar onInsert={(type: StepType) => insertStepAt(index, type)} />
              <article
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setHoverIndex(index);
                }}
                onDragLeave={() => setHoverIndex(null)}
                onDrop={() => handleDrop(index)}
                onClick={() => selectStep(step.id)}
                className={[
                  "group rounded border bg-white transition",
                  hoverIndex === index ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200",
                  isSelected ? "border-blue-500 shadow-sm ring-2 ring-blue-100" : "",
                  isFailed ? "border-red-400 ring-2 ring-red-100" : "",
                  isActive ? "border-emerald-400 ring-2 ring-emerald-100" : "",
                ].join(" ")}
              >
                <div className="flex items-start gap-3 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${meta.accent}`} />
                      <h3 className="text-sm font-semibold text-slate-950">{meta.label}</h3>
                      {issueCounts?.errors ? (
                        <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                          {issueCounts.errors} error
                        </span>
                      ) : null}
                      {issueCounts?.warnings ? (
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {issueCounts.warnings} warning
                        </span>
                      ) : null}
                    </div>
                    {!isCollapsed && (
                      <p className="mt-1 truncate text-sm leading-6 text-slate-600">{summarizeStep(step)}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1 opacity-100 md:opacity-0 md:transition md:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleCollapsed(step.id);
                      }}
                      className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      {isCollapsed ? "Show" : "Hide"}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        duplicateStep(step.id);
                      }}
                      className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteStep(step.id);
                      }}
                      className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            </div>
          );
        })}
        <InsertBar onInsert={(type) => insertStepAt(steps.length, type)} />
      </div>
    </section>
  );
}
