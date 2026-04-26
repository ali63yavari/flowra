"use client";

import { useEffect, useMemo, useState } from "react";
import InsertBar from "@/components/flow/InsertBar";
import { Icon, IconButton, type IconName } from "@/components/ui/IconButton";
import { useExecute } from "@/hooks/useExecute";
import { nodeMeta } from "@/lib/nodeMeta";
import { getStepSummary } from "@/lib/stepSummary";
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
  const validate = useWorkflowStore((s) => s.validate);
  const moveStep = useWorkflowStore((s) => s.moveStep);
  const selectStep = useWorkflowStore((s) => s.selectStep);
  const deleteStep = useWorkflowStore((s) => s.deleteStep);
  const duplicateStep = useWorkflowStore((s) => s.duplicateStep);
  const collapseAllSteps = useWorkflowStore((s) => s.collapseAllSteps);
  const expandAllSteps = useWorkflowStore((s) => s.expandAllSteps);
  const createWorkflow = useWorkflowStore((s) => s.createWorkflow);
  const { runStep, loading } = useExecute();

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ stepId: string; x: number; y: number } | null>(null);

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

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", close);
    };
  }, [contextMenu]);

  const executeStep = (stepId: string) =>
    runStep(stepId, {
      email: "user@example.com",
      password: "password",
    });

  if (!activeWorkflowId) {
    return (
      <section className="flex min-h-[420px] flex-col justify-center rounded border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">No active workflow</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-950">Create a workflow</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
          A workflow belongs to a collection and contains a sequence of one or more request steps.
          Create one here or choose an existing workflow from the sidebar.
        </p>
        <div className="mt-4">
          <IconButton
            label="Create workflow"
            icon="plus"
            tone="primary"
            onClick={() => createWorkflow(activeCollectionId)}
          />
        </div>
      </section>
    );
  }

  if (steps.length === 0) {
    return (
      <section className="flex min-h-[640px] flex-col rounded border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Linear flow</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">Blank workflow</h2>
        </div>
        <div className="flex flex-1 flex-col justify-center p-8">
          <div className="mx-auto w-full max-w-md text-center">
            <h3 className="text-sm font-semibold text-slate-950">No request steps yet</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Add the first request step to start defining this workflow from scratch.
            </p>
            <div className="mt-6 px-8">
              <InsertBar alwaysVisible onInsert={(type) => insertStepAt(0, type)} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Linear flow</p>
          <div className="flex items-center gap-1">
            <IconButton
              label="Validate workflow"
              icon="check"
              className="h-6 w-6 rounded-sm [&_svg]:h-3.5 [&_svg]:w-3.5"
              onClick={() => validate()}
            />
            <IconButton
              label="Expand all request cards"
              icon="expandAll"
              className="h-6 w-6 rounded-sm [&_svg]:h-3.5 [&_svg]:w-3.5"
              onClick={expandAllSteps}
            />
            <IconButton
              label="Collapse all request cards"
              icon="collapseAll"
              className="h-6 w-6 rounded-sm [&_svg]:h-3.5 [&_svg]:w-3.5"
              onClick={collapseAllSteps}
            />
          </div>
        </div>
        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-950">
          {steps.length} configured steps
        </p>
      </div>

      <div className="px-5 py-4">
        {steps.map((step, index) => {
          const meta = nodeMeta[step.type];
          const isSelected = selectedStepId === step.id;
          const isCollapsed = collapsedStepIds.includes(step.id);
          const issueCounts = issuesByStep[step.id];
          const isActive = execution.activeStepId === step.id;
          const isFailed = execution.failedStepId === step.id;
          const typeIcon = getStepTypeIcon(step.type);
          const summary = getStepSummary(step);
          const validationState = issueCounts?.errors
            ? "error"
            : issueCounts?.warnings
              ? "warning"
              : "ok";
          const cardTone =
            validationState === "error"
              ? "border-red-200 bg-red-50/55"
              : validationState === "warning"
                ? "border-amber-200 bg-amber-50/60"
                : "border-slate-200 bg-white";
          const indicatorTone =
            validationState === "error"
              ? "bg-red-500 ring-red-200"
              : "bg-amber-400 ring-amber-200";

          return (
            <div key={step.id} className="group/step relative pr-5">
              {index === 0 ? <InsertBar onInsert={(type: StepType) => insertStepAt(0, type)} /> : null}
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
                onContextMenu={(event) => {
                  event.preventDefault();
                  selectStep(step.id);
                  setContextMenu({ stepId: step.id, x: event.clientX, y: event.clientY });
                }}
                className={[
                  "relative rounded-lg border transition",
                  cardTone,
                  hoverIndex === index ? "border-blue-400 ring-2 ring-blue-100" : "",
                  isSelected ? "border-blue-500 shadow-sm ring-2 ring-blue-100" : "",
                  isFailed ? "border-red-400 ring-2 ring-red-100" : "",
                  isActive ? "border-emerald-400 ring-2 ring-emerald-100" : "",
                ].join(" ")}
              >
                <div className="flex items-start gap-2.5 p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-slate-600">
                        <Icon name={typeIcon} className="h-3.5 w-3.5" />
                      </span>
                      <h3 className="min-w-0 flex-1 text-sm font-semibold leading-5 text-slate-950">
                        {meta.label}
                      </h3>
                      <span className="group/info relative shrink-0">
                        <button
                          type="button"
                          aria-label={`${meta.label} information`}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:bg-slate-100 focus:text-slate-700 focus:outline-none"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Icon name="info" className="h-3.5 w-3.5" />
                        </button>
                        <span className="pointer-events-none absolute right-0 top-6 z-[9999] hidden w-56 rounded border border-slate-200 bg-white p-2 text-xs leading-5 text-slate-600 shadow-xl group-hover/info:block group-focus-within/info:block">
                          {meta.description}
                        </span>
                      </span>
                    </div>
                    {!isCollapsed && (
                      <div className="mt-1.5 space-y-1">
                        <p className="break-words text-sm leading-5 text-slate-700">
                          {summary.primary}
                        </p>
                        <p className="break-words text-xs leading-5 text-slate-500">
                          {summary.secondary}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                {validationState !== "ok" ? (
                  <span
                    className={[
                      "absolute -left-1 -top-1 h-3 w-3 rounded-full ring-4 animate-pulse",
                      indicatorTone,
                    ].join(" ")}
                    title={
                      validationState === "error"
                        ? `${issueCounts?.errors ?? 0} validation errors`
                        : `${issueCounts?.warnings ?? 0} validation warnings`
                    }
                  />
                ) : null}
              </article>
              <div
                className="absolute right-0 top-[58px] z-10 flex -translate-y-1/2 flex-col gap-px rounded-sm border border-slate-200 bg-white p-px opacity-0 shadow-sm transition group-hover/step:opacity-100"
                onClick={(event) => event.stopPropagation()}
              >
                <IconButton
                  label="Execute this request step"
                  icon="play"
                  tone="success"
                  disabled={loading}
                  className="h-[18px] w-[18px] rounded-sm [&_svg]:h-3 [&_svg]:w-3"
                  onClick={() => executeStep(step.id)}
                />
                <IconButton
                  label="Duplicate step"
                  icon="copy"
                  className="h-[18px] w-[18px] rounded-sm [&_svg]:h-3 [&_svg]:w-3"
                  onClick={() => duplicateStep(step.id)}
                />
                <IconButton
                  label="Delete step"
                  icon="trash"
                  tone="danger"
                  className="h-[18px] w-[18px] rounded-sm [&_svg]:h-3 [&_svg]:w-3"
                  onClick={() => deleteStep(step.id)}
                />
              </div>
              <InsertBar onInsert={(type: StepType) => insertStepAt(index + 1, type)} />
            </div>
          );
        })}
      </div>
      {contextMenu ? (
        <div
          className="fixed z-50 w-48 rounded border border-slate-200 bg-white p-1 text-sm shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              executeStep(contextMenu.stepId);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <Icon name="play" className="h-3.5 w-3.5 text-emerald-700" />
            Execute request
          </button>
          <button
            type="button"
            onClick={() => {
              duplicateStep(contextMenu.stepId);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-slate-700 hover:bg-slate-100"
          >
            <Icon name="copy" className="h-3.5 w-3.5" />
            Duplicate request
          </button>
          <button
            type="button"
            onClick={() => {
              deleteStep(contextMenu.stepId);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-red-700 hover:bg-red-50"
          >
            <Icon name="trash" className="h-3.5 w-3.5" />
            Delete request
          </button>
        </div>
      ) : null}
    </section>
  );
}

function getStepTypeIcon(type: StepType): IconName {
  switch (type) {
    case "http_request":
      return "globe";
    case "extract":
      return "scanSearch";
    case "condition":
      return "gitBranch";
    case "form_submit":
      return "fileInput";
    case "browser":
      return "mousePointerClick";
  }
}
