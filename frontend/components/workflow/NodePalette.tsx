"use client";

import { useMemo, useState } from "react";
import { workflowTemplates } from "@/lib/templates";
import { useWorkflowStore } from "@/store/workflowStore";

export default function NodePalette() {
  const collections = useWorkflowStore((s) => s.collections);
  const workflows = useWorkflowStore((s) => s.workflows);
  const activeCollectionId = useWorkflowStore((s) => s.activeCollectionId);
  const activeWorkflowId = useWorkflowStore((s) => s.activeWorkflowId);
  const createCollection = useWorkflowStore((s) => s.createCollection);
  const renameCollection = useWorkflowStore((s) => s.renameCollection);
  const deleteCollection = useWorkflowStore((s) => s.deleteCollection);
  const selectCollection = useWorkflowStore((s) => s.selectCollection);
  const createWorkflow = useWorkflowStore((s) => s.createWorkflow);
  const renameWorkflow = useWorkflowStore((s) => s.renameWorkflow);
  const duplicateWorkflow = useWorkflowStore((s) => s.duplicateWorkflow);
  const deleteWorkflow = useWorkflowStore((s) => s.deleteWorkflow);
  const selectWorkflow = useWorkflowStore((s) => s.selectWorkflow);
  const loadTemplate = useWorkflowStore((s) => s.loadTemplate);

  const [expandedIds, setExpandedIds] = useState<string[]>(() => Object.keys(collections));

  const collectionList = useMemo(
    () => Object.values(collections).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [collections]
  );

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((collectionId) => collectionId !== id) : [...current, id]
    );
  };

  const handleCreateCollection = () => {
    const name = window.prompt("Collection name", `Collection ${collectionList.length + 1}`);
    if (!name) return;
    const id = createCollection(name);
    setExpandedIds((current) => [...new Set([...current, id])]);
  };

  const handleCreateWorkflow = (collectionId: string) => {
    const name = window.prompt("Workflow name", "Untitled workflow");
    if (!name) return;
    createWorkflow(collectionId, name);
    setExpandedIds((current) => [...new Set([...current, collectionId])]);
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-slate-950 text-white">
      <div className="border-b border-white/10 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Flowra</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Collections</h1>
          <button
            type="button"
            onClick={handleCreateCollection}
            className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/15"
          >
            New
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {collectionList.length === 0 ? (
          <div className="rounded border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
            Create a collection to start organizing workflows.
          </div>
        ) : (
          <div className="space-y-3">
            {collectionList.map((collection) => {
              const isExpanded = expandedIds.includes(collection.id);
              const isActiveCollection = collection.id === activeCollectionId;
              const collectionWorkflows = collection.workflowIds
                .map((workflowId) => workflows[workflowId])
                .filter(Boolean);

              return (
                <section
                  key={collection.id}
                  className={[
                    "rounded border bg-white/5",
                    isActiveCollection ? "border-blue-300/50" : "border-white/10",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-1 p-2">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(collection.id)}
                      className="h-7 w-7 rounded text-xs text-slate-300 hover:bg-white/10"
                      aria-label={isExpanded ? "Collapse collection" : "Expand collection"}
                    >
                      {isExpanded ? "−" : "+"}
                    </button>
                    <button
                      type="button"
                      onClick={() => selectCollection(collection.id)}
                      className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-white"
                    >
                      {collection.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreateWorkflow(collection.id)}
                      className="rounded px-2 py-1 text-xs font-semibold text-blue-100 hover:bg-white/10"
                    >
                      Flow
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="space-y-1 border-t border-white/10 p-2">
                      {collectionWorkflows.length === 0 ? (
                        <p className="px-2 py-2 text-xs leading-5 text-slate-400">No workflows yet.</p>
                      ) : (
                        collectionWorkflows.map((workflow) => (
                          <div
                            key={workflow.id}
                            className={[
                              "group rounded px-2 py-2",
                              workflow.id === activeWorkflowId ? "bg-blue-500/20" : "hover:bg-white/10",
                            ].join(" ")}
                          >
                            <button
                              type="button"
                              onClick={() => selectWorkflow(workflow.id)}
                              className="block w-full min-w-0 text-left"
                            >
                              <span className="block truncate text-sm font-medium text-white">{workflow.name}</span>
                              <span className="mt-0.5 block text-xs text-slate-400">
                                {workflow.workflow.steps.length} steps
                              </span>
                            </button>
                            <div className="mt-2 flex flex-wrap gap-1 opacity-100 lg:opacity-0 lg:transition lg:group-hover:opacity-100">
                              <ActionButton
                                label="Rename"
                                onClick={() => {
                                  const name = window.prompt("Workflow name", workflow.name);
                                  if (name) renameWorkflow(workflow.id, name);
                                }}
                              />
                              <ActionButton label="Copy" onClick={() => duplicateWorkflow(workflow.id)} />
                              <ActionButton
                                label="Delete"
                                tone="danger"
                                onClick={() => {
                                  if (window.confirm(`Delete "${workflow.name}"?`)) deleteWorkflow(workflow.id);
                                }}
                              />
                            </div>
                          </div>
                        ))
                      )}

                      <div className="flex flex-wrap gap-1 border-t border-white/10 pt-2">
                        <ActionButton
                          label="Rename collection"
                          onClick={() => {
                            const name = window.prompt("Collection name", collection.name);
                            if (name) renameCollection(collection.id, name);
                          }}
                        />
                        <ActionButton
                          label="Delete collection"
                          tone="danger"
                          onClick={() => {
                            if (window.confirm(`Delete "${collection.name}" and all its workflows?`)) {
                              deleteCollection(collection.id);
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        <section className="mt-6">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">New from template</h2>
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

function ActionButton({
  label,
  tone = "default",
  onClick,
}: {
  label: string;
  tone?: "default" | "danger";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded px-2 py-1 text-[11px] font-semibold",
        tone === "danger"
          ? "bg-red-500/10 text-red-200 hover:bg-red-500/20"
          : "bg-white/10 text-slate-200 hover:bg-white/15",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
