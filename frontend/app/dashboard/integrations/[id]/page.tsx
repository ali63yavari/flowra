"use client";

import Image from "next/image";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import FlowBuilder from "@/components/flow/FlowBuilder";
import { Icon, IconButton } from "@/components/ui/IconButton";
import { useExecute } from "@/hooks/useExecute";
import CollectionsWorkspace from "@/components/workflow/CollectionsWorkspace";
import EndpointAccessPanel from "@/components/workflow/EndpointAccessPanel";
import EnvironmentManager from "@/components/workflow/EnvironmentManager";
import NodeEditor from "@/components/workflow/NodeEditor";
import RunPanel from "@/components/workflow/RunPanel";
import WorkflowCanvas from "@/components/workflow/WorkflowCanvas";
import {
  createBackendCollection,
  createBackendWorkflow,
  listCollections,
  loadBackendVariableSet,
} from "@/lib/api";
import type { VariableScope } from "@/lib/types";
import { useWorkflowStore } from "@/store/workflowStore";

const WORKFLOW_ACCESS_ROLES = ["Collection", "Automation Admin", "Operator", "Viewer"];

type WorkspaceTab =
  | { id: "collections"; type: "collections"; title: "Collections" }
  | { id: string; type: "workflow"; workflowId: string; title: string };

export default function BuilderPage() {
  const [environmentManagerOpen, setEnvironmentManagerOpen] = useState(false);
  const [environmentInitialScope, setEnvironmentInitialScope] = useState<VariableScope>("tenant");
  const [expandedWorkspacePanel, setExpandedWorkspacePanel] = useState<"flow" | "graph" | null>(null);
  const [activeTabId, setActiveTabId] = useState("collections");
  const [workflowTabIds, setWorkflowTabIds] = useState<string[]>([]);
  const [runInputText, setRunInputText] = useState('{\n  "email": "test@test.com",\n  "password": "123456"\n}');
  const [runInputError, setRunInputError] = useState<string | null>(null);
  const [builderHeight, setBuilderHeight] = useState(() => {
    if (typeof window === "undefined") return 40;
    const stored = window.localStorage.getItem("flowra-builder-panel-height");
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? Math.min(68, Math.max(26, parsed)) : 40;
  });
  const collections = useWorkflowStore((s) => s.collections);
  const workflows = useWorkflowStore((s) => s.workflows);
  const activeCollection = useWorkflowStore((s) =>
    s.activeCollectionId ? s.collections[s.activeCollectionId] : undefined
  );
  const activeWorkflow = useWorkflowStore((s) =>
    s.activeWorkflowId ? s.workflows[s.activeWorkflowId] : undefined
  );
  const errors = useWorkflowStore((s) => s.errors);
  const activeEnvironment = useWorkflowStore((s) => s.variables.activeEnvironment);
  const renameWorkflow = useWorkflowStore((s) => s.renameWorkflow);
  const updateWorkflowDescription = useWorkflowStore((s) => s.updateWorkflowDescription);
  const updateWorkflowAccess = useWorkflowStore((s) => s.updateWorkflowAccess);
  const createWorkflow = useWorkflowStore((s) => s.createWorkflow);
  const selectCollection = useWorkflowStore((s) => s.selectCollection);
  const selectWorkflow = useWorkflowStore((s) => s.selectWorkflow);
  const hydrateWorkspace = useWorkflowStore((s) => s.hydrateWorkspace);
  const hydrateVariables = useWorkflowStore((s) => s.hydrateVariables);
  const { run, loading } = useExecute();

  const blockingErrors = errors.filter((issue) => issue.severity === "error").length;
  const warnings = errors.filter((issue) => issue.severity === "warning").length;
  const executionHeight = `calc(100% - ${builderHeight}% - 10px)`;
  const hasBlockingErrors = blockingErrors > 0;
  const activeIsWorkflow = activeTabId !== "collections";

  const tabs = useMemo<WorkspaceTab[]>(() => {
    const workflowTabs: WorkspaceTab[] = workflowTabIds
      .map((workflowId) => workflows[workflowId])
      .filter(Boolean)
      .map((workflow) => ({
        id: `workflow:${workflow.id}`,
        type: "workflow",
        workflowId: workflow.id,
        title: workflow.name,
      }));
    return [{ id: "collections", type: "collections", title: "Collections" }, ...workflowTabs];
  }, [workflowTabIds, workflows]);

  const openWorkflowTab = (workflowId: string) => {
    if (!workflows[workflowId]) return;
    selectWorkflow(workflowId);
    setWorkflowTabIds((current) => [...new Set([...current, workflowId])]);
    setActiveTabId(`workflow:${workflowId}`);
  };

  const focusTab = (tab: WorkspaceTab) => {
    setActiveTabId(tab.id);
    if (tab.type === "workflow") selectWorkflow(tab.workflowId);
  };

  const closeWorkflowTab = (workflowId: string) => {
    setWorkflowTabIds((current) => current.filter((id) => id !== workflowId));
    if (activeTabId === `workflow:${workflowId}`) setActiveTabId("collections");
  };

  const beginVerticalResize = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const container = event.currentTarget.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const handleMove = (moveEvent: MouseEvent) => {
      const next = ((moveEvent.clientY - rect.top) / rect.height) * 100;
      const clamped = Math.min(68, Math.max(26, next));
      setBuilderHeight(clamped);
      window.localStorage.setItem("flowra-builder-panel-height", String(clamped));
    };
    const handleUp = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  const handleRunWorkflow = async () => {
    if (!activeWorkflow) {
      setRunInputError("Select or create a workflow before running.");
      return;
    }
    try {
      const parsed = JSON.parse(runInputText) as Record<string, string | number | boolean | null>;
      setRunInputError(null);
      await run(parsed);
    } catch {
      setRunInputError("Workflow input must be valid JSON.");
    }
  };

  const openCollectionVariables = (collectionId: string) => {
    selectCollection(collectionId);
    setEnvironmentInitialScope("collection");
    setEnvironmentManagerOpen(true);
  };

  useEffect(() => {
    let cancelled = false;
    listCollections()
      .then(async (response) => {
        if (response.collections.length > 0) return response;
        await seedCurrentWorkspaceToBackend();
        return listCollections();
      })
      .then((response) => {
        if (cancelled) return;
        hydrateWorkspace(response.collections);
        return loadBackendVariableSet(response.collections.map((collection) => collection.id));
      })
      .then((variables) => {
        if (!cancelled && variables) hydrateVariables(variables);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [hydrateVariables, hydrateWorkspace]);

  return (
    <main className="h-screen overflow-hidden bg-slate-100 text-slate-950">
      <div
        className="grid h-screen"
        style={{
          gridTemplateColumns: activeIsWorkflow ? "minmax(0, 1fr) 380px" : "minmax(0, 1fr) 0px",
          gridTemplateRows: "56px 42px minmax(0, 1fr)",
        }}
      >
        <TopBar
          activeEnvironment={activeEnvironment}
          onOpenTenantVariables={() => {
            setEnvironmentInitialScope("tenant");
            setEnvironmentManagerOpen(true);
          }}
        />

        <div className="col-span-2 flex min-w-0 items-end gap-1 border-b border-slate-200 bg-white px-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => focusTab(tab)}
              className={[
                "mb-[-1px] flex h-9 min-w-0 max-w-[240px] items-center gap-2 rounded-t border px-3 text-sm font-semibold transition",
                tab.id === activeTabId
                  ? "border-slate-200 border-b-white bg-white text-slate-950"
                  : "border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-950",
              ].join(" ")}
            >
              <Icon name={tab.type === "collections" ? "list" : "fileCode"} className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{tab.title}</span>
              {tab.type === "workflow" && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Close ${tab.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    closeWorkflowTab(tab.workflowId);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") closeWorkflowTab(tab.workflowId);
                  }}
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  <Icon name="x" className="h-3 w-3" />
                </span>
              )}
            </button>
          ))}
        </div>

        <section className="min-h-0 min-w-0 overflow-hidden">
          {activeTabId === "collections" ? (
            <CollectionsWorkspace
              onOpenWorkflow={openWorkflowTab}
              onOpenVariables={openCollectionVariables}
            />
          ) : (
            <WorkflowWorkspace
              activeCollectionName={activeCollection?.name ?? "No collection selected"}
              activeWorkflow={activeWorkflow}
              blockingErrors={blockingErrors}
              warnings={warnings}
              loading={loading}
              hasBlockingErrors={hasBlockingErrors}
              runInputText={runInputText}
              runInputError={runInputError}
              builderHeight={builderHeight}
              executionHeight={executionHeight}
              expandedWorkspacePanel={expandedWorkspacePanel}
              onRun={handleRunWorkflow}
              onRenameWorkflow={renameWorkflow}
              onUpdateWorkflowDescription={updateWorkflowDescription}
              onUpdateWorkflowAccess={updateWorkflowAccess}
              onCreateWorkflow={() => {
                const collectionId = activeCollection?.id ?? Object.keys(collections)[0];
                const id = createWorkflow(collectionId);
                openWorkflowTab(id);
              }}
              onResize={beginVerticalResize}
              onSetRunInputText={setRunInputText}
              onToggleWorkspacePanel={setExpandedWorkspacePanel}
            />
          )}
        </section>

        <div className={activeIsWorkflow ? "min-h-0 overflow-hidden border-l border-slate-200 bg-white" : "hidden"}>
          {activeIsWorkflow && <NodeEditor />}
        </div>
      </div>
      <EnvironmentManager
        key={environmentInitialScope}
        open={environmentManagerOpen}
        initialScope={environmentInitialScope}
        onClose={() => setEnvironmentManagerOpen(false)}
      />
    </main>
  );
}

function TopBar({
  activeEnvironment,
  onOpenTenantVariables,
}: {
  activeEnvironment: string;
  onOpenTenantVariables: () => void;
}) {
  return (
    <div className="col-span-2 border-b border-slate-200 bg-white px-4">
      <div className="flex h-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-slate-200 bg-white shadow-sm">
            <Image src="/flowra-mark.svg" alt="Flowra" width={30} height={30} priority className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h1 className="text-lg font-black tracking-normal text-slate-950">Flowra</h1>
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Automate · Connect · Simplify
              </p>
            </div>
            <p className="text-xs font-semibold text-slate-500">Acme Automation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenTenantVariables}
            className="rounded bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Environment: {activeEnvironment}
          </button>
          <IconButton label="Tenant variables" icon="key" onClick={onOpenTenantVariables} />
          <IconButton label="Notifications" icon="check" onClick={() => undefined} />
          <button className="flex h-8 w-8 items-center justify-center rounded bg-slate-950 text-xs font-semibold text-white">
            AR
          </button>
        </div>
      </div>
    </div>
  );
}

function WorkflowWorkspace({
  activeCollectionName,
  activeWorkflow,
  blockingErrors,
  warnings,
  loading,
  hasBlockingErrors,
  runInputText,
  runInputError,
  builderHeight,
  executionHeight,
  expandedWorkspacePanel,
  onRun,
  onRenameWorkflow,
  onUpdateWorkflowDescription,
  onUpdateWorkflowAccess,
  onCreateWorkflow,
  onResize,
  onSetRunInputText,
  onToggleWorkspacePanel,
}: {
  activeCollectionName: string;
  activeWorkflow: ReturnType<typeof useWorkflowStore.getState>["workflows"][string] | undefined;
  blockingErrors: number;
  warnings: number;
  loading: boolean;
  hasBlockingErrors: boolean;
  runInputText: string;
  runInputError: string | null;
  builderHeight: number;
  executionHeight: string;
  expandedWorkspacePanel: "flow" | "graph" | null;
  onRun: () => void;
  onRenameWorkflow: (id: string, name: string) => void;
  onUpdateWorkflowDescription: (id: string, description: string) => void;
  onUpdateWorkflowAccess: (id: string, access: { isOnline?: boolean; accessRole?: string }) => void;
  onCreateWorkflow: () => void;
  onResize: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onSetRunInputText: (value: string) => void;
  onToggleWorkspacePanel: (panel: "flow" | "graph" | null | ((panel: "flow" | "graph" | null) => "flow" | "graph" | null)) => void;
}) {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-hidden p-3">
      <header className="relative z-30 shrink-0 rounded border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-y-0 left-0 w-1 bg-blue-500" />
        <div className="px-3 py-1">
          {activeWorkflow ? (
            <div className="grid min-w-0 grid-cols-[148px_minmax(0,1fr)_auto] gap-2">
              <div className="flex flex-col gap-1 border-r border-slate-100 pr-2">
                <button
                  type="button"
                  title={loading ? "Workflow is running" : "Run workflow"}
                  onClick={onRun}
                  disabled={loading || hasBlockingErrors}
                  className="inline-flex h-6 items-center justify-center gap-1 rounded bg-emerald-600 px-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  <Icon name="play" className="h-3 w-3 fill-current" />
                  Execute
                </button>
                <button
                  type="button"
                  title="Toggle whether this workflow is reachable through its REST endpoint"
                  onClick={() => onUpdateWorkflowAccess(activeWorkflow.id, { isOnline: !activeWorkflow.isOnline })}
                  className={[
                    "group flex h-6 items-center justify-between rounded border px-1.5 text-left transition",
                    activeWorkflow.isOnline
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                  ].join(" ")}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      className={[
                        "h-2 w-2 shrink-0 rounded-full ring-2",
                        activeWorkflow.isOnline
                          ? "animate-pulse bg-emerald-500 ring-emerald-200"
                          : "bg-slate-300 ring-slate-200",
                      ].join(" ")}
                    />
                    <span className="truncate text-[10px] font-bold">API access</span>
                  </span>
                  <span className="rounded bg-white/70 px-1 text-[9px] font-bold uppercase tracking-wide">
                    {activeWorkflow.isOnline ? "Online" : "Off"}
                  </span>
                </button>
                <label className="flex h-6 items-center gap-1 rounded border border-slate-200 bg-white px-1.5">
                  <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-slate-400">Role</span>
                  <select
                    aria-label="Allowed external role"
                    value={activeWorkflow.accessRole ?? "Collection"}
                    onChange={(event) => onUpdateWorkflowAccess(activeWorkflow.id, { accessRole: event.target.value })}
                    className="min-w-0 flex-1 bg-transparent text-[10px] font-semibold text-slate-700 outline-none"
                  >
                    {WORKFLOW_ACCESS_ROLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                    {activeCollectionName}
                  </span>
                  <span className="shrink-0 text-xs text-slate-300" aria-hidden="true">/</span>
                  <WorkflowNameInput
                    key={`${activeWorkflow.id}:${activeWorkflow.name}`}
                    workflowId={activeWorkflow.id}
                    name={activeWorkflow.name}
                    onCommit={onRenameWorkflow}
                  />
                </div>
                <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                  <input
                    value={activeWorkflow.description}
                    onChange={(event) => onUpdateWorkflowDescription(activeWorkflow.id, event.target.value)}
                    placeholder="Add a short workflow description"
                    className="min-w-0 flex-1 rounded border border-transparent bg-transparent text-[11px] leading-4 text-slate-600 outline-none hover:border-slate-200 focus:border-blue-300 focus:bg-white focus:px-1.5"
                  />
                </div>
              </div>

              <div className="flex min-w-[230px] flex-col items-end gap-1">
                <div className="flex shrink-0 items-center gap-1">
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                    {activeWorkflow.workflow.steps.length} steps
                  </span>
                  <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                    {blockingErrors} errors
                  </span>
                  <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    {warnings} warnings
                  </span>
                </div>
                <EndpointAccessPanel workflowId={activeWorkflow.id} steps={activeWorkflow.workflow.steps} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-slate-950">No workflow selected</h1>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Open a workflow from Collections or create a new one.
                </p>
              </div>
              <IconButton label="Create workflow" icon="plus" tone="primary" onClick={onCreateWorkflow} />
            </div>
          )}
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className={[
            "grid min-h-0 gap-3 overflow-hidden",
            expandedWorkspacePanel ? "grid-cols-1" : "xl:grid-cols-[minmax(390px,0.85fr)_minmax(420px,1.15fr)]",
          ].join(" ")}
          style={{ height: `${builderHeight}%` }}
        >
          {expandedWorkspacePanel !== "graph" && (
            <WorkspacePanelFrame
              label={expandedWorkspacePanel === "flow" ? "Exit fullscreen linear flow" : "Fullscreen linear flow"}
              expanded={expandedWorkspacePanel === "flow"}
              onToggle={() => onToggleWorkspacePanel((panel) => (panel === "flow" ? null : "flow"))}
            >
              <FlowBuilder />
            </WorkspacePanelFrame>
          )}
          {expandedWorkspacePanel !== "flow" && (
            <WorkspacePanelFrame
              label={expandedWorkspacePanel === "graph" ? "Exit fullscreen graph preview" : "Fullscreen graph preview"}
              expanded={expandedWorkspacePanel === "graph"}
              onToggle={() => onToggleWorkspacePanel((panel) => (panel === "graph" ? null : "graph"))}
            >
              <WorkflowCanvas />
            </WorkspacePanelFrame>
          )}
        </div>
        <button
          type="button"
          aria-label="Resize builder and execution panels"
          onMouseDown={onResize}
          className="my-1.5 flex h-2 w-full cursor-row-resize items-center justify-center rounded bg-transparent hover:bg-blue-100"
        >
          <span className="h-0.5 w-16 rounded bg-slate-300" />
        </button>
        <div style={{ height: executionHeight }}>
          <RunPanel inputText={runInputText} inputError={runInputError} onInputChange={onSetRunInputText} />
        </div>
      </div>
    </section>
  );
}

function WorkflowNameInput({
  workflowId,
  name,
  onCommit,
}: {
  workflowId: string;
  name: string;
  onCommit: (id: string, name: string) => void;
}) {
  const [draftName, setDraftName] = useState(name);

  const commitDraft = () => {
    const nextName = draftName;
    if (!nextName.trim()) {
      setDraftName(name);
      return;
    }
    if (nextName !== name) {
      onCommit(workflowId, nextName);
    } else {
      setDraftName(name);
    }
  };

  const cancelDraft = (target: HTMLInputElement) => {
    setDraftName(name);
    target.blur();
  };

  return (
    <input
      aria-label="Workflow name"
      value={draftName}
      onChange={(event) => setDraftName(event.target.value)}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commitDraft();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          cancelDraft(event.currentTarget);
        }
      }}
      className="min-w-0 flex-1 rounded border border-transparent bg-transparent text-sm font-semibold leading-5 text-slate-950 outline-none hover:border-slate-200 focus:border-blue-300 focus:bg-white focus:px-1.5"
    />
  );
}

function WorkspacePanelFrame({
  children,
  expanded,
  label,
  onToggle,
}: {
  children: ReactNode;
  expanded: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <div className="relative min-h-0 min-w-0 overflow-hidden">
      <div className="absolute right-3 top-3 z-20">
        <IconButton
          label={label}
          icon={expanded ? "collapseAll" : "expandAll"}
          onClick={onToggle}
          className="border border-slate-200 bg-white/95 shadow-sm hover:bg-slate-100"
        />
      </div>
      {children}
    </div>
  );
}

async function seedCurrentWorkspaceToBackend() {
  const state = useWorkflowStore.getState();
  const collections = Object.values(state.collections);

  for (const collection of collections) {
    await createBackendCollection(collection.id, collection.name, {
      description: collection.description,
      isOnline: collection.isOnline,
      accessRole: collection.accessRole,
    });
    for (const workflowId of collection.workflowIds) {
      const workflow = state.workflows[workflowId];
      if (!workflow) continue;
      await createBackendWorkflow(collection.id, {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        definition: workflow.workflow,
      });
    }
  }
}
