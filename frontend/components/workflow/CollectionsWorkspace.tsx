"use client";

import { useMemo, useState } from "react";
import { Icon, IconButton } from "@/components/ui/IconButton";
import {
  createBackendCollection,
  createBackendWorkflow,
  deleteBackendCollection,
  deleteBackendWorkflow,
  duplicateBackendWorkflow,
  updateBackendCollection,
  updateBackendWorkflow,
} from "@/lib/api";
import type { CollectionWorkflow, WorkspaceCollection } from "@/lib/types";
import { useWorkflowStore } from "@/store/workflowStore";

const COLLECTION_ROLES = ["Collection", "Automation Admin", "Operator", "Viewer"];

type CollectionDialogMode = "create" | "edit";

interface CollectionFormState {
  id?: string;
  name: string;
  description: string;
  isOnline: boolean;
  accessRole: string;
}

export default function CollectionsWorkspace({
  onOpenWorkflow,
  onOpenVariables,
}: {
  onOpenWorkflow: (workflowId: string) => void;
  onOpenVariables: (collectionId: string) => void;
}) {
  const collections = useWorkflowStore((s) => s.collections);
  const workflows = useWorkflowStore((s) => s.workflows);
  const variables = useWorkflowStore((s) => s.variables);
  const activeEnvironment = useWorkflowStore((s) => s.variables.activeEnvironment);
  const createCollection = useWorkflowStore((s) => s.createCollection);
  const updateCollectionMeta = useWorkflowStore((s) => s.updateCollectionMeta);
  const deleteCollection = useWorkflowStore((s) => s.deleteCollection);
  const selectCollection = useWorkflowStore((s) => s.selectCollection);
  const createWorkflow = useWorkflowStore((s) => s.createWorkflow);
  const renameWorkflow = useWorkflowStore((s) => s.renameWorkflow);
  const duplicateWorkflow = useWorkflowStore((s) => s.duplicateWorkflow);
  const deleteWorkflow = useWorkflowStore((s) => s.deleteWorkflow);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");
  const [sortMode, setSortMode] = useState<"updated" | "name" | "workflows">("updated");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [collectionDialog, setCollectionDialog] = useState<{
    mode: CollectionDialogMode;
    value: CollectionFormState;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceCollection | null>(null);
  const [workflowEditTarget, setWorkflowEditTarget] = useState<CollectionWorkflow | null>(null);
  const [workflowDeleteTarget, setWorkflowDeleteTarget] = useState<CollectionWorkflow | null>(null);
  const [selectedWorkflowIds, setSelectedWorkflowIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<Record<string, "idle" | "queued" | "done">>({});

  const collectionList = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return Object.values(collections)
      .filter((collection) => {
        if (statusFilter === "online" && !collection.isOnline) return false;
        if (statusFilter === "offline" && collection.isOnline) return false;
        if (!normalizedQuery) return true;
        return [collection.name, collection.description, collection.accessRole]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (sortMode === "name") return a.name.localeCompare(b.name);
        if (sortMode === "workflows") return b.workflowIds.length - a.workflowIds.length;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [collections, query, sortMode, statusFilter]);

  const selectedCollection =
    (selectedCollectionId ? collections[selectedCollectionId] : undefined) ?? collectionList[0];
  const selectedWorkflows = selectedCollection
    ? selectedCollection.workflowIds.map((id) => workflows[id]).filter(Boolean)
    : [];
  const selectedBulkWorkflows = selectedWorkflowIds.map((id) => workflows[id]).filter(Boolean);

  const openCollectionDialog = (mode: CollectionDialogMode, collection?: WorkspaceCollection) => {
    setCollectionDialog({
      mode,
      value: {
        id: collection?.id,
        name: collection?.name ?? "",
        description: collection?.description ?? "",
        isOnline: collection?.isOnline ?? false,
        accessRole: collection?.accessRole ?? "Collection",
      },
    });
  };

  const saveCollection = async (value: CollectionFormState) => {
    const name = value.name.trim();
    if (!name) return;
    if (collectionDialog?.mode === "edit" && value.id) {
      updateCollectionMeta(value.id, {
        name,
        description: value.description,
        isOnline: value.isOnline,
        accessRole: value.accessRole,
      });
      void updateBackendCollection(value.id, {
        name,
        description: value.description,
        isOnline: value.isOnline,
        accessRole: value.accessRole,
      }).catch(() => undefined);
    } else {
      const id = createCollection(name, {
        description: value.description,
        isOnline: value.isOnline,
        accessRole: value.accessRole,
      });
      selectCollection(id);
      setSelectedCollectionId(id);
      void createBackendCollection(id, name, {
        description: value.description,
        isOnline: value.isOnline,
        accessRole: value.accessRole,
      }).catch(() => undefined);
    }
    setCollectionDialog(null);
  };

  const createBlankWorkflow = async (collectionId: string) => {
    const id = createWorkflow(collectionId, "Untitled workflow");
    void createBackendWorkflow(collectionId, {
      id,
      name: "Untitled workflow",
      definition: { steps: [] },
    }).catch(() => undefined);
    onOpenWorkflow(id);
  };

  const toggleSelectedWorkflow = (workflowId: string) => {
    setSelectedWorkflowIds((current) =>
      current.includes(workflowId)
        ? current.filter((id) => id !== workflowId)
        : [...current, workflowId]
    );
  };

  const duplicateSelected = () => {
    selectedWorkflowIds.forEach((workflowId) => {
      const copyId = duplicateWorkflow(workflowId);
      if (copyId) void duplicateBackendWorkflow(workflowId, copyId).catch(() => undefined);
    });
    setSelectedWorkflowIds([]);
  };

  const deleteSelected = () => {
    selectedWorkflowIds.forEach((workflowId) => {
      deleteWorkflow(workflowId);
      void deleteBackendWorkflow(workflowId).catch(() => undefined);
    });
    setSelectedWorkflowIds([]);
    setBulkOpen(false);
  };

  const executeSelected = async () => {
    const status = Object.fromEntries(selectedWorkflowIds.map((id) => [id, "queued" as const]));
    setBulkStatus(status);
    selectedWorkflowIds.forEach((id, index) => {
      window.setTimeout(() => {
        setBulkStatus((current) => ({ ...current, [id]: "done" }));
      }, 350 * (index + 1));
    });
  };

  const collectionVariableCount = (collectionId: string) =>
    Object.keys(variables.collections[collectionId]?.[activeEnvironment] ?? {}).length;

  const healthCounts = (collection: WorkspaceCollection) => {
    const issues = collection.workflowIds.flatMap((workflowId) => workflows[workflowId]?.errors ?? []);
    return {
      errors: issues.filter((issue) => issue.severity === "error").length,
      warnings: issues.filter((issue) => issue.severity === "warning").length,
    };
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tenant collections</p>
            <h1 className="text-lg font-semibold text-slate-950">Collections workspace</h1>
          </div>
          <button
            type="button"
            onClick={() => openCollectionDialog("create")}
            className="inline-flex h-9 items-center gap-2 rounded bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Icon name="plus" className="h-4 w-4" />
            Create collection
          </button>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-[minmax(220px,1fr)_160px_160px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search collections, roles, descriptions"
            className="input-control bg-white"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="input-control bg-white"
          >
            <option value="all">All API states</option>
            <option value="online">Online only</option>
            <option value="offline">Offline only</option>
          </select>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as typeof sortMode)}
            className="input-control bg-white"
          >
            <option value="updated">Recently updated</option>
            <option value="name">Name</option>
            <option value="workflows">Workflow count</option>
          </select>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-3 xl:grid-cols-[minmax(420px,1fr)_420px]">
        <div className="min-h-0 overflow-auto">
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {collectionList.map((collection) => {
              const counts = healthCounts(collection);
              const isSelected = selectedCollection?.id === collection.id;
              return (
                <article
                  key={collection.id}
                  className={[
                    "rounded border bg-white p-4 shadow-sm transition",
                    isSelected ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-200",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        selectCollection(collection.id);
                        setSelectedCollectionId(collection.id);
                      }}
                      className="min-w-0 text-left"
                    >
                      <h2 className="truncate text-base font-semibold text-slate-950">{collection.name}</h2>
                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                        {collection.description || "No collection description yet."}
                      </p>
                    </button>
                    <span
                      className={[
                        "rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
                        collection.isOnline
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500",
                      ].join(" ")}
                    >
                      {collection.isOnline ? "API online" : "API off"}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <Metric label="Workflows" value={String(collection.workflowIds.length)} />
                    <Metric label="Variables" value={String(collectionVariableCount(collection.id))} />
                    <Metric label="Role" value={collection.accessRole || "Collection"} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge tone={counts.errors ? "red" : "slate"}>{counts.errors} errors</Badge>
                    <Badge tone={counts.warnings ? "amber" : "slate"}>{counts.warnings} warnings</Badge>
                    <Badge tone="slate">Updated {formatDate(collection.updatedAt)}</Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-1">
                      <IconButton
                        label="Edit collection"
                        icon="edit"
                        className="h-7 w-7"
                        onClick={() => openCollectionDialog("edit", collection)}
                      />
                      <IconButton
                        label="Collection variables"
                        icon="key"
                        className="h-7 w-7"
                        onClick={() => onOpenVariables(collection.id)}
                      />
                      <IconButton
                        label="Delete collection"
                        icon="trash"
                        tone="danger"
                        className="h-7 w-7"
                        onClick={() => setDeleteTarget(collection)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => createBlankWorkflow(collection.id)}
                      className="rounded bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      New workflow
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="flex min-h-0 flex-col rounded border border-slate-200 bg-white shadow-sm">
          {selectedCollection ? (
            <>
              <div className="shrink-0 border-b border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected collection</p>
                <h2 className="mt-1 truncate text-lg font-semibold text-slate-950">{selectedCollection.name}</h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  {selectedCollection.description || "Add a description from the edit dialog."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={selectedCollection.isOnline ? "green" : "slate"}>
                    {selectedCollection.isOnline ? "External API enabled" : "External API disabled"}
                  </Badge>
                  <Badge tone="blue">Role: {selectedCollection.accessRole}</Badge>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-950">Workflows</h3>
                  <div className="flex items-center gap-2">
                    {selectedWorkflowIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setBulkOpen(true)}
                        className="rounded bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white"
                      >
                        Bulk edit ({selectedWorkflowIds.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => createBlankWorkflow(selectedCollection.id)}
                      className="rounded bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      Add
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {selectedWorkflows.length === 0 ? (
                    <div className="rounded border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                      No workflows yet. Create one to start building this collection.
                    </div>
                  ) : (
                    selectedWorkflows.map((workflow) => (
                      <div key={workflow.id} className="rounded border border-slate-200 p-3">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={selectedWorkflowIds.includes(workflow.id)}
                            onChange={() => toggleSelectedWorkflow(workflow.id)}
                            className="mt-1 h-4 w-4 accent-blue-600"
                          />
                          <button
                            type="button"
                            onClick={() => onOpenWorkflow(workflow.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="truncate text-sm font-semibold text-slate-950">{workflow.name}</p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {workflow.workflow.steps.length} request steps · {workflow.accessRole}
                            </p>
                          </button>
                          <div className="flex shrink-0 items-center gap-1">
                            <IconButton
                              label="Open workflow"
                              icon="chevronRight"
                              className="h-7 w-7"
                              onClick={() => onOpenWorkflow(workflow.id)}
                            />
                            <IconButton
                              label="Rename workflow"
                              icon="edit"
                              className="h-7 w-7"
                              onClick={() => setWorkflowEditTarget(workflow)}
                            />
                            <IconButton
                              label="Duplicate workflow"
                              icon="copy"
                              className="h-7 w-7"
                              onClick={() => {
                                const copyId = duplicateWorkflow(workflow.id);
                                if (copyId) void duplicateBackendWorkflow(workflow.id, copyId).catch(() => undefined);
                              }}
                            />
                            <IconButton
                              label="Delete workflow"
                              icon="trash"
                              tone="danger"
                              className="h-7 w-7"
                              onClick={() => setWorkflowDeleteTarget(workflow)}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-sm text-slate-500">Create a collection to start organizing workflows.</div>
          )}
        </aside>
      </div>

      {collectionDialog && (
        <CollectionDialog
          mode={collectionDialog.mode}
          value={collectionDialog.value}
          onChange={(value) => setCollectionDialog((current) => (current ? { ...current, value } : current))}
          onClose={() => setCollectionDialog(null)}
          onSave={() => saveCollection(collectionDialog.value)}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete collection"
          body={`Delete "${deleteTarget.name}" and all workflows and variables inside it?`}
          actionLabel="Delete collection"
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteCollection(deleteTarget.id);
            void deleteBackendCollection(deleteTarget.id).catch(() => undefined);
            setDeleteTarget(null);
          }}
        />
      )}
      {workflowEditTarget && (
        <WorkflowEditDialog
          workflow={workflowEditTarget}
          onClose={() => setWorkflowEditTarget(null)}
          onSave={(name, description) => {
            renameWorkflow(workflowEditTarget.id, name);
            void updateBackendWorkflow(workflowEditTarget.id, { name, description }).catch(() => undefined);
            setWorkflowEditTarget(null);
          }}
        />
      )}
      {workflowDeleteTarget && (
        <ConfirmDialog
          title="Delete workflow"
          body={`Delete "${workflowDeleteTarget.name}"?`}
          actionLabel="Delete workflow"
          onClose={() => setWorkflowDeleteTarget(null)}
          onConfirm={() => {
            deleteWorkflow(workflowDeleteTarget.id);
            void deleteBackendWorkflow(workflowDeleteTarget.id).catch(() => undefined);
            setWorkflowDeleteTarget(null);
          }}
        />
      )}
      {bulkOpen && (
        <BulkDrawer
          workflows={selectedBulkWorkflows}
          statuses={bulkStatus}
          onClose={() => setBulkOpen(false)}
          onDuplicate={duplicateSelected}
          onDelete={deleteSelected}
          onExecute={executeSelected}
          onOpenWorkflow={onOpenWorkflow}
        />
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-slate-50 px-2 py-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function Badge({ tone, children }: { tone: "slate" | "red" | "amber" | "green" | "blue"; children: React.ReactNode }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return <span className={`rounded px-2 py-1 text-[10px] font-semibold ${tones[tone]}`}>{children}</span>;
}

function CollectionDialog({
  mode,
  value,
  onChange,
  onClose,
  onSave,
}: {
  mode: CollectionDialogMode;
  value: CollectionFormState;
  onChange: (value: CollectionFormState) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <DialogFrame title={mode === "create" ? "Create collection" : "Edit collection"} onClose={onClose}>
      <div className="space-y-3">
        <label className="block">
          <span className="field-label">Name</span>
          <input
            value={value.name}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
            className="input-control"
            autoFocus
          />
        </label>
        <label className="block">
          <span className="field-label">Description</span>
          <textarea
            value={value.description}
            onChange={(event) => onChange({ ...value, description: event.target.value })}
            className="h-20 w-full resize-none rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <button
          type="button"
          onClick={() => onChange({ ...value, isOnline: !value.isOnline })}
          className={[
            "flex w-full items-center justify-between rounded border px-3 py-2 text-sm font-semibold",
            value.isOnline ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600",
          ].join(" ")}
        >
          API access
          <span>{value.isOnline ? "Online" : "Offline"}</span>
        </button>
        <label className="block">
          <span className="field-label">Allowed role</span>
          <select
            value={value.accessRole}
            onChange={(event) => onChange({ ...value, accessRole: event.target.value })}
            className="input-control"
          >
            {COLLECTION_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
      </div>
      <DialogActions onClose={onClose} onSave={onSave} saveLabel={mode === "create" ? "Create" : "Save"} />
    </DialogFrame>
  );
}

function WorkflowEditDialog({
  workflow,
  onClose,
  onSave,
}: {
  workflow: CollectionWorkflow;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}) {
  const [name, setName] = useState(workflow.name);
  const [description, setDescription] = useState(workflow.description);
  return (
    <DialogFrame title="Edit workflow" onClose={onClose}>
      <div className="space-y-3">
        <label className="block">
          <span className="field-label">Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} className="input-control" autoFocus />
        </label>
        <label className="block">
          <span className="field-label">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="h-20 w-full resize-none rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>
      <DialogActions onClose={onClose} onSave={() => onSave(name.trim() || "Untitled workflow", description)} saveLabel="Save" />
    </DialogFrame>
  );
}

function ConfirmDialog({
  title,
  body,
  actionLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <DialogFrame title={title} onClose={onClose}>
      <p className="text-sm leading-6 text-slate-600">{body}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded border border-slate-200 px-3 py-2 text-sm font-semibold">
          Cancel
        </button>
        <button type="button" onClick={onConfirm} className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white">
          {actionLabel}
        </button>
      </div>
    </DialogFrame>
  );
}

function DialogFrame({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/40 p-4">
      <section className="w-full max-w-lg rounded border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <IconButton label="Close dialog" icon="x" onClick={onClose} />
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}

function DialogActions({
  onClose,
  onSave,
  saveLabel,
}: {
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <button type="button" onClick={onClose} className="rounded border border-slate-200 px-3 py-2 text-sm font-semibold">
        Cancel
      </button>
      <button type="button" onClick={onSave} className="rounded bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
        {saveLabel}
      </button>
    </div>
  );
}

function BulkDrawer({
  workflows,
  statuses,
  onClose,
  onDuplicate,
  onDelete,
  onExecute,
  onOpenWorkflow,
}: {
  workflows: CollectionWorkflow[];
  statuses: Record<string, "idle" | "queued" | "done">;
  onClose: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onExecute: () => void;
  onOpenWorkflow: (workflowId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[130] flex justify-end bg-slate-950/25">
      <aside className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bulk workflow tools</p>
            <h2 className="text-base font-semibold text-slate-950">{workflows.length} workflows selected</h2>
          </div>
          <IconButton label="Close bulk drawer" icon="x" onClick={onClose} />
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-5">
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={onExecute} className="rounded bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              Execute
            </button>
            <button type="button" onClick={onDuplicate} className="rounded bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
              Duplicate
            </button>
            <button type="button" onClick={onDelete} className="rounded bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              Delete
            </button>
          </div>
          <div className="mt-5 space-y-2">
            {workflows.map((workflow) => (
              <button
                key={workflow.id}
                type="button"
                onClick={() => onOpenWorkflow(workflow.id)}
                className="block w-full rounded border border-slate-200 p-3 text-left hover:border-blue-200"
              >
                <span className="block text-sm font-semibold text-slate-950">{workflow.name}</span>
                <span className="mt-1 block text-xs text-slate-500">
                  {workflow.workflow.steps.length} steps · {statuses[workflow.id] ?? "idle"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}
