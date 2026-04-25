"use client";

import { useMemo, useState } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { workflowTemplates } from "@/lib/templates";
import { useWorkflowStore } from "@/store/workflowStore";

export default function NodePalette({ collapsed = false }: { collapsed?: boolean }) {
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
  const [templateCollectionId, setTemplateCollectionId] = useState<string | null>(null);
  const [collectionQuery, setCollectionQuery] = useState("");

  const collectionList = useMemo(
    () => Object.values(collections).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [collections]
  );

  const visibleCollections = useMemo(() => {
    const query = collectionQuery.trim().toLowerCase();
    if (!query) return collectionList;
    return collectionList.filter((collection) => collection.name.toLowerCase().includes(query));
  }, [collectionList, collectionQuery]);

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

  const handleCreateBlankWorkflow = (collectionId: string) => {
    createWorkflow(collectionId, "Untitled workflow");
    setExpandedIds((current) => [...new Set([...current, collectionId])]);
    setTemplateCollectionId(null);
  };

  const handleCreateFromTemplate = (collectionId: string, templateId: string) => {
    if (activeCollectionId !== collectionId) selectCollection(collectionId);
    const template = workflowTemplates.find((item) => item.id === templateId);
    if (template) loadTemplate(template);
    setExpandedIds((current) => [...new Set([...current, collectionId])]);
    setTemplateCollectionId(null);
  };

  return (
    <aside className="flex h-screen w-full flex-col border-r border-slate-200 bg-slate-950 text-white">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center gap-3 rounded border border-white/10 bg-white/5 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-blue-500 text-sm font-black text-white">
            F
          </div>
          <div className={collapsed ? "hidden" : "min-w-0"}>
            <h1 className="truncate text-base font-semibold text-white">Flowra</h1>
            <p className="truncate text-xs text-slate-400">Web-to-API workspace</p>
          </div>
        </div>
      </div>

      <div className={collapsed ? "hidden" : "border-b border-white/10 px-3 py-3"}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Collections</h2>
          <div className="flex items-center gap-1">
            <IconButton
              label="Expand all collections"
              icon="expandAll"
              tone="inverse"
              onClick={() => setExpandedIds(collectionList.map((collection) => collection.id))}
            />
            <IconButton
              label="Collapse all collections"
              icon="collapseAll"
              tone="inverse"
              onClick={() => setExpandedIds([])}
            />
            <IconButton
              label="Create collection"
              icon="plus"
              tone="inverse"
              onClick={handleCreateCollection}
              className="bg-white/10"
            />
          </div>
        </div>
        <label className="mt-3 block">
          <span className="sr-only">Search collections</span>
          <input
            value={collectionQuery}
            onChange={(event) => setCollectionQuery(event.target.value)}
            placeholder="Search collections"
            className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-300/60 focus:bg-white/10"
          />
        </label>
      </div>

      <div className={collapsed ? "scrollbar-auto-hide min-h-0 flex-1 overflow-y-auto px-2 py-4" : "scrollbar-auto-hide min-h-0 flex-1 overflow-y-auto px-3 py-4"}>
        {collectionList.length === 0 ? (
          <div className="rounded border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
            Create a collection to start organizing workflows.
          </div>
        ) : visibleCollections.length === 0 ? (
          <div className="rounded border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
            No collections match your search.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleCollections.map((collection) => {
              const isExpanded = expandedIds.includes(collection.id);
              const isActiveCollection = collection.id === activeCollectionId;
              const collectionWorkflows = collection.workflowIds
                .map((workflowId) => workflows[workflowId])
                .filter(Boolean);

              return (
                <section
                  key={collection.id}
                  className={[
                    collapsed ? "rounded border bg-white/5 p-1" : "rounded border bg-white/5",
                    isActiveCollection ? "border-blue-300/50" : "border-white/10",
                  ].join(" ")}
                >
                  {collapsed ? (
                    <button
                      type="button"
                      title={collection.name}
                      onClick={() => selectCollection(collection.id)}
                      className="flex h-9 w-full items-center justify-center rounded text-xs font-bold text-white hover:bg-white/10"
                    >
                      {collection.name.slice(0, 2).toUpperCase()}
                    </button>
                  ) : (
                    <>
                  <div className="flex items-center gap-1 p-2">
                    <IconButton
                      label={isExpanded ? "Collapse collection" : "Expand collection"}
                      icon={isExpanded ? "chevronDown" : "chevronRight"}
                      tone="inverse"
                      onClick={() => toggleExpanded(collection.id)}
                    />
                    <button
                      type="button"
                      onClick={() => selectCollection(collection.id)}
                      className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-white"
                    >
                      {collection.name}
                    </button>
                    <IconButton
                      label="Create workflow"
                      icon="plus"
                      tone="primary"
                      onClick={() => setTemplateCollectionId(collection.id)}
                    />
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
                            <div className="flex items-start gap-2">
                              <button
                                type="button"
                                onClick={() => selectWorkflow(workflow.id)}
                                className="min-w-0 flex-1 text-left"
                              >
                                <span className="block truncate text-sm font-medium text-white">{workflow.name}</span>
                                <span className="mt-0.5 block text-xs text-slate-400">
                                  {workflow.workflow.steps.length} request steps
                                </span>
                              </button>
                              <div className="flex shrink-0 items-center gap-0.5 opacity-100 lg:opacity-0 lg:transition lg:group-hover:opacity-100">
                                <IconButton
                                  label="Rename workflow"
                                  icon="edit"
                                  tone="inverse"
                                  onClick={() => {
                                    const name = window.prompt("Workflow name", workflow.name);
                                    if (name) renameWorkflow(workflow.id, name);
                                  }}
                                />
                                <IconButton
                                  label="Duplicate workflow"
                                  icon="copy"
                                  tone="inverse"
                                  onClick={() => duplicateWorkflow(workflow.id)}
                                />
                                <IconButton
                                  label="Delete workflow"
                                  icon="trash"
                                  tone="inverseDanger"
                                  onClick={() => {
                                    if (window.confirm(`Delete "${workflow.name}"?`)) deleteWorkflow(workflow.id);
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      )}

                      <div className="flex justify-end gap-1 border-t border-white/10 pt-2">
                        <IconButton
                          label="Rename collection"
                          icon="edit"
                          tone="inverse"
                          onClick={() => {
                            const name = window.prompt("Collection name", collection.name);
                            if (name) renameCollection(collection.id, name);
                          }}
                        />
                        <IconButton
                          label="Delete collection"
                          icon="trash"
                          tone="inverseDanger"
                          onClick={() => {
                            if (window.confirm(`Delete "${collection.name}" and all its workflows?`)) {
                              deleteCollection(collection.id);
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                    </>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {templateCollectionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">New workflow</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  Start blank or choose a template
                </h2>
              </div>
              <IconButton label="Close dialog" icon="x" onClick={() => setTemplateCollectionId(null)} />
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-2">
              <button
                type="button"
                onClick={() => handleCreateBlankWorkflow(templateCollectionId)}
                className="rounded border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="text-sm font-semibold text-slate-950">Blank workflow</span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">
                  Create an empty workflow and add request steps manually.
                </span>
              </button>

              {workflowTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleCreateFromTemplate(templateCollectionId, template.id)}
                  className="rounded border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <span className="text-sm font-semibold text-slate-950">{template.name}</span>
                  <span className="mt-1 block text-sm leading-6 text-slate-600">{template.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
