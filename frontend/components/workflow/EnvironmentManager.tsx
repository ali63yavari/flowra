"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon, IconButton } from "@/components/ui/IconButton";
import type { EnvironmentVariableSet, VariableScope } from "@/lib/types";
import { useWorkflowStore } from "@/store/workflowStore";

type ImportMode = "json" | "delimited";
type ExportMode = "active" | "all";

export default function EnvironmentManager({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const collections = useWorkflowStore((s) => s.collections);
  const activeCollectionId = useWorkflowStore((s) => s.activeCollectionId);
  const variables = useWorkflowStore((s) => s.variables);
  const createEnvironment = useWorkflowStore((s) => s.createEnvironment);
  const renameEnvironment = useWorkflowStore((s) => s.renameEnvironment);
  const deleteEnvironment = useWorkflowStore((s) => s.deleteEnvironment);
  const setActiveEnvironment = useWorkflowStore((s) => s.setActiveEnvironment);
  const updateTenantVariables = useWorkflowStore((s) => s.updateTenantVariables);
  const updateCollectionVariables = useWorkflowStore((s) => s.updateCollectionVariables);

  const [scope, setScope] = useState<VariableScope>("tenant");
  const [newEnvironmentName, setNewEnvironmentName] = useState("");
  const [renameValue, setRenameValue] = useState(() => variables.activeEnvironment);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>("json");
  const [importText, setImportText] = useState("");
  const [keyValueSeparator, setKeyValueSeparator] = useState(":");
  const [pairSeparator, setPairSeparator] = useState("\\n");
  const [importError, setImportError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>("active");

  const activeEnvironment = variables.activeEnvironment;
  const activeCollection = activeCollectionId ? collections[activeCollectionId] : undefined;
  const currentVariables = useMemo(() => {
    if (scope === "tenant") return variables.tenant[activeEnvironment] ?? {};
    if (!activeCollectionId) return {};
    return variables.collections[activeCollectionId]?.[activeEnvironment] ?? {};
  }, [activeCollectionId, activeEnvironment, scope, variables.collections, variables.tenant]);
  const tenantVariableRefs = useMemo(
    () =>
      Object.entries(variables.tenant[activeEnvironment] ?? {}).map(([key, value]) => ({
        key,
        value,
        ref: `{{var.${key}}}`,
      })),
    [activeEnvironment, variables.tenant]
  );
  const entries = Object.entries(currentVariables);
  const exportJson = useMemo(
    () =>
      JSON.stringify(
        buildVariableExportPayload({
          activeCollectionId,
          activeEnvironment,
          scope,
          variables,
          mode: exportMode,
        }),
        null,
        2
      ),
    [activeCollectionId, activeEnvironment, exportMode, scope, variables]
  );

  const commitVariables = (nextVariables: Record<string, string>) => {
    if (scope === "tenant") {
      updateTenantVariables(activeEnvironment, nextVariables);
      return;
    }
    if (activeCollectionId) {
      updateCollectionVariables(activeCollectionId, activeEnvironment, nextVariables);
    }
  };

  const addVariable = () => {
    const key = getUniqueKey(currentVariables, "new_variable");
    commitVariables({ ...currentVariables, [key]: "" });
  };

  const updateVariableKey = (oldKey: string, nextKey: string) => {
    const trimmedKey = nextKey.trim();
    const nextEntries = entries
      .filter(([key]) => key !== oldKey)
      .concat([[trimmedKey, currentVariables[oldKey] ?? ""]]);
    commitVariables(Object.fromEntries(nextEntries.filter(([key]) => key)));
    setSelectedKeys((keys) => keys.map((key) => (key === oldKey ? trimmedKey : key)).filter(Boolean));
  };

  const updateVariableValue = (key: string, value: string) => {
    commitVariables({ ...currentVariables, [key]: value });
  };

  const removeVariable = (key: string) => {
    commitVariables(Object.fromEntries(entries.filter(([entryKey]) => entryKey !== key)));
    setSelectedKeys((keys) => keys.filter((selectedKey) => selectedKey !== key));
  };

  const removeSelectedVariables = () => {
    const selected = new Set(selectedKeys);
    commitVariables(Object.fromEntries(entries.filter(([key]) => !selected.has(key))));
    setSelectedKeys([]);
  };

  const appendImport = () => {
    try {
      const imported =
        importMode === "json"
          ? parseKeyValueJSON(importText)
          : parseDelimitedKeyValues(importText, keyValueSeparator, pairSeparator);
      commitVariables({ ...currentVariables, ...imported });
      setImportText("");
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Could not import variables.");
    }
  };

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activeEnvironment, onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/30 p-4">
      <section className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-blue-50 text-blue-700">
              <Icon name="key" className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-950">Environment variables</h2>
              <p className="truncate text-sm text-slate-500">
                Tenant defaults and collection overrides for reusable workflow values.
              </p>
            </div>
          </div>
          <IconButton label="Close environment manager" icon="x" onClick={onClose} />
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Environments</p>
                <IconButton
                  label="Create environment"
                  icon="plus"
                  tone="primary"
                  className="h-7 w-7"
                  onClick={() => {
                    createEnvironment(newEnvironmentName || "new-env");
                    setRenameValue(newEnvironmentName || "new-env");
                    setSelectedKeys([]);
                    setNewEnvironmentName("");
                  }}
                />
              </div>
              <input
                value={newEnvironmentName}
                onChange={(event) => setNewEnvironmentName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    createEnvironment(newEnvironmentName || "new-env");
                    setRenameValue(newEnvironmentName || "new-env");
                    setSelectedKeys([]);
                    setNewEnvironmentName("");
                  }
                }}
                placeholder="dev, staging, prod"
                className="input-control bg-white"
              />
              <div className="space-y-1">
                {variables.environments.map((environment) => (
                  <button
                    key={environment}
                    type="button"
                    onClick={() => {
                      setActiveEnvironment(environment);
                      setRenameValue(environment);
                      setSelectedKeys([]);
                    }}
                    className={[
                      "flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm font-semibold transition",
                      environment === activeEnvironment
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-slate-600 hover:bg-white hover:text-slate-950",
                    ].join(" ")}
                  >
                    <span className="truncate">{environment}</span>
                    <span className="text-xs font-medium text-slate-400">
                      {(variables.tenant[environment] ? Object.keys(variables.tenant[environment]).length : 0) +
                        Object.values(variables.collections).reduce(
                          (count, collectionVariables) =>
                            count + Object.keys(collectionVariables[environment] ?? {}).length,
                          0
                        )}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-950">Active environment</p>
              <input
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                className="mt-2 input-control"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => renameEnvironment(activeEnvironment, renameValue)}
                  className="rounded bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Rename
                </button>
                <IconButton
                  label="Delete environment"
                  icon="trash"
                  tone="danger"
                  disabled={variables.environments.length <= 1}
                  onClick={() => deleteEnvironment(activeEnvironment)}
                />
              </div>
            </div>
          </aside>

          <div className="min-h-0 overflow-y-auto p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scope</p>
                <div className="mt-2 flex rounded border border-slate-200 bg-slate-50 p-0.5">
                  <ScopeButton
                    active={scope === "tenant"}
                    onClick={() => {
                      setScope("tenant");
                      setSelectedKeys([]);
                    }}
                  >
                    Tenant
                  </ScopeButton>
                  <ScopeButton
                    active={scope === "collection"}
                    onClick={() => {
                      setScope("collection");
                      setSelectedKeys([]);
                    }}
                  >
                    {activeCollection?.name ?? "Collection"}
                  </ScopeButton>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <IconButton
                  label="View variables as JSON"
                  icon="fileCode"
                  onClick={() => setExportOpen((current) => !current)}
                />
                <button
                  type="button"
                  onClick={removeSelectedVariables}
                  disabled={!selectedKeys.length}
                  className="rounded bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete selected
                </button>
                <IconButton label="Add variable" icon="plus" tone="primary" onClick={addVariable} />
              </div>
            </div>

            {exportOpen ? (
              <div className="relative z-10 mt-4 rounded border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Variables JSON</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Exporting {scope === "tenant" ? "tenant" : activeCollection?.name ?? "collection"} variables.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex rounded border border-slate-200 bg-white p-0.5">
                      <ScopeButton active={exportMode === "active"} onClick={() => setExportMode("active")}>
                        {activeEnvironment}
                      </ScopeButton>
                      <ScopeButton active={exportMode === "all"} onClick={() => setExportMode("all")}>
                        All envs
                      </ScopeButton>
                    </div>
                    <IconButton
                      label="Copy variables JSON"
                      icon="copy"
                      tone="primary"
                      onClick={() => void navigator.clipboard?.writeText(exportJson)}
                    />
                  </div>
                </div>
                <pre className="mt-3 max-h-72 overflow-auto rounded border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-800">
                  {exportJson}
                </pre>
              </div>
            ) : null}

            <div className="relative z-20 mt-4 rounded border border-slate-200">
              <div className="grid grid-cols-[36px_minmax(120px,0.9fr)_minmax(180px,1.1fr)_44px] border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span />
                <span>Key</span>
                <span>Value</span>
                <span />
              </div>
              <div className="divide-y divide-slate-100">
                {entries.length ? (
                  entries.map(([key, value]) => (
                    <VariableRow
                      key={key}
                      entryKey={key}
                      value={value}
                      selected={selectedKeys.includes(key)}
                      onSelectedChange={(selected) =>
                        setSelectedKeys((keys) =>
                          selected ? [...keys, key] : keys.filter((selectedKey) => selectedKey !== key)
                        )
                      }
                      onKeyChange={updateVariableKey}
                      onValueChange={updateVariableValue}
                      onRemove={removeVariable}
                      tenantVariables={scope === "collection" ? tenantVariableRefs : []}
                    />
                  ))
                ) : (
                  <p className="p-5 text-sm text-slate-500">No variables in this scope yet.</p>
                )}
              </div>
            </div>

            <div className="relative z-10 mt-5 rounded border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Append variables</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Imported keys are merged into the current {scope} scope for {activeEnvironment}.
                  </p>
                </div>
                <div className="flex rounded border border-slate-200 bg-slate-50 p-0.5">
                  <ScopeButton active={importMode === "json"} onClick={() => setImportMode("json")}>
                    JSON
                  </ScopeButton>
                  <ScopeButton active={importMode === "delimited"} onClick={() => setImportMode("delimited")}>
                    Text
                  </ScopeButton>
                </div>
              </div>

              {importMode === "delimited" && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="field-label">Key/value separator</span>
                    <input
                      value={keyValueSeparator}
                      onChange={(event) => setKeyValueSeparator(event.target.value)}
                      className="input-control"
                    />
                  </label>
                  <label className="block">
                    <span className="field-label">Pair separator</span>
                    <input
                      value={pairSeparator}
                      onChange={(event) => setPairSeparator(event.target.value)}
                      className="input-control"
                    />
                  </label>
                </div>
              )}

              <textarea
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder={
                  importMode === "json"
                    ? '{\n  "baseUrl": "https://api.example.com",\n  "apiKey": "secret"\n}'
                    : "baseUrl:https://api.example.com\\napiKey:secret"
                }
                className="mt-3 min-h-32 w-full rounded border border-slate-200 bg-white p-3 font-mono text-xs leading-5 text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              {importError ? <p className="mt-2 text-sm text-red-700">{importError}</p> : null}
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={appendImport}
                  className="inline-flex items-center gap-2 rounded bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <Icon name="fileInput" className="h-4 w-4" />
                  Append import
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function VariableRow({
  entryKey,
  value,
  selected,
  onSelectedChange,
  onKeyChange,
  onValueChange,
  onRemove,
  tenantVariables,
}: {
  entryKey: string;
  value: string;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  onKeyChange: (oldKey: string, nextKey: string) => void;
  onValueChange: (key: string, value: string) => void;
  onRemove: (key: string) => void;
  tenantVariables: TenantVariableRef[];
}) {
  const [draftKey, setDraftKey] = useState(entryKey);

  const commitKey = () => {
    const trimmedKey = draftKey.trim();
    if (!trimmedKey) {
      setDraftKey(entryKey);
      return;
    }
    if (trimmedKey !== entryKey) onKeyChange(entryKey, trimmedKey);
  };

  return (
    <div className="grid grid-cols-[36px_minmax(120px,0.9fr)_minmax(180px,1.1fr)_44px] items-center gap-2 px-3 py-2">
      <input
        type="checkbox"
        checked={selected}
        onChange={(event) => onSelectedChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />
      <input
        value={draftKey}
        onChange={(event) => setDraftKey(event.target.value)}
        onBlur={commitKey}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className="input-control"
      />
      <TenantVariableValueInput
        value={value}
        variables={tenantVariables}
        onChange={(nextValue) => onValueChange(entryKey, nextValue)}
      />
      <IconButton label={`Delete ${entryKey}`} icon="trash" tone="danger" onClick={() => onRemove(entryKey)} />
    </div>
  );
}

interface TenantVariableRef {
  key: string;
  value: string;
  ref: string;
}

function TenantVariableValueInput({
  value,
  variables,
  onChange,
}: {
  value: string;
  variables: TenantVariableRef[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visibleVariables = variables.filter((variable) =>
    `${variable.key} ${variable.ref}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  const tooltip = buildTenantVariableTooltip(value, variables);

  const updateValue = (nextValue: string) => {
    onChange(nextValue);
    if (variables.length && nextValue.endsWith("{{")) {
      setOpen(true);
      setQuery("");
    }
  };

  const insertVariable = (variable: TenantVariableRef) => {
    const nextValue = value.endsWith("{{")
      ? `${value.slice(0, -2)}${variable.ref}`
      : `${value}${variable.ref}`;
    onChange(nextValue);
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <div className="relative z-30">
      <input
        value={value}
        title={tooltip}
        onChange={(event) => updateValue(event.target.value)}
        className="input-control pr-9 font-mono text-xs"
      />
      {variables.length ? (
        <button
          type="button"
          aria-label="Insert tenant variable"
          title="Insert tenant variable"
          onClick={() => setOpen((current) => !current)}
          className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded text-slate-400 transition hover:bg-blue-50 hover:text-blue-700"
        >
          <Icon name="braces" className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {open ? (
        <div className="absolute right-0 top-full z-[160] mt-1 w-72 overflow-hidden rounded border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 p-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tenant variables"
              className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-blue-400"
            />
          </div>
          <div className="max-h-56 overflow-auto p-1">
            {visibleVariables.length ? (
              visibleVariables.map((variable) => (
                <button
                  key={variable.ref}
                  type="button"
                  onClick={() => insertVariable(variable)}
                  className="block w-full rounded px-2 py-2 text-left hover:bg-slate-50"
                >
                  <code className="text-xs font-semibold text-slate-800">{variable.ref}</code>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{variable.value || "Empty value"}</span>
                </button>
              ))
            ) : (
              <p className="p-3 text-sm text-slate-500">No tenant variables match your search.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ScopeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded px-3 py-1.5 text-xs font-semibold transition",
        active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-950",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function getUniqueKey(value: Record<string, string>, base: string) {
  if (!Object.prototype.hasOwnProperty.call(value, base)) return base;
  let index = 2;
  while (Object.prototype.hasOwnProperty.call(value, `${base}_${index}`)) index += 1;
  return `${base}_${index}`;
}

function parseKeyValueJSON(input: string): Record<string, string> {
  const parsed = JSON.parse(input);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON import must be an object.");
  }
  return Object.fromEntries(
    Object.entries(parsed).map(([key, entryValue]) => [key, stringifyImportedValue(entryValue)])
  );
}

function parseDelimitedKeyValues(
  input: string,
  keyValueSeparator: string,
  pairSeparator: string
): Record<string, string> {
  const keySeparator = decodeSeparator(keyValueSeparator);
  const rowSeparator = decodeSeparator(pairSeparator);
  if (!keySeparator) throw new Error("Key/value separator is required.");
  if (!rowSeparator) throw new Error("Pair separator is required.");

  const pairs = input
    .split(rowSeparator)
    .map((pair) => pair.trim())
    .filter(Boolean);

  return Object.fromEntries(
    pairs.map((pair) => {
      const separatorIndex = pair.indexOf(keySeparator);
      if (separatorIndex < 0) {
        throw new Error(`Missing key/value separator in: ${pair}`);
      }
      const key = pair.slice(0, separatorIndex).trim();
      const entryValue = pair.slice(separatorIndex + keySeparator.length).trim();
      if (!key) throw new Error("Keys cannot be empty.");
      return [key, entryValue];
    })
  );
}

function decodeSeparator(value: string) {
  return value.replaceAll("\\n", "\n").replaceAll("\\t", "\t");
}

function stringifyImportedValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function buildVariableExportPayload({
  activeCollectionId,
  activeEnvironment,
  scope,
  variables,
  mode,
}: {
  activeCollectionId?: string;
  activeEnvironment: string;
  scope: VariableScope;
  variables: EnvironmentVariableSet;
  mode: ExportMode;
}) {
  if (scope === "tenant") {
    return mode === "active"
      ? { scope, environment: activeEnvironment, variables: variables.tenant[activeEnvironment] ?? {} }
      : { scope, environments: variables.tenant };
  }

  const collectionVariables = activeCollectionId ? variables.collections[activeCollectionId] ?? {} : {};
  return mode === "active"
    ? {
        scope,
        collectionId: activeCollectionId ?? null,
        environment: activeEnvironment,
        variables: collectionVariables[activeEnvironment] ?? {},
      }
    : {
        scope,
        collectionId: activeCollectionId ?? null,
        environments: collectionVariables,
      };
}

function buildTenantVariableTooltip(value: string, variables: TenantVariableRef[]) {
  const variableMap = new Map(variables.map((variable) => [variable.ref, variable.value]));
  const refs = Array.from(value.matchAll(/\{\{\s*var\.([^}]+?)\s*\}\}/g), (match) => `{{var.${match[1].trim()}}}`);
  if (!refs.length) return undefined;
  return refs.map((ref) => `${ref}: ${variableMap.get(ref) ?? "Unknown tenant variable"}`).join("\n");
}
