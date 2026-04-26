"use client";

import { useEffect, useState } from "react";
import { Icon, IconButton } from "@/components/ui/IconButton";
import { nodeMeta } from "@/lib/nodeMeta";
import type {
  BrowserAction,
  ConditionConfig,
  EnvironmentVariableSet,
  ExtractConfig,
  FormSubmitConfig,
  HTTPRequestConfig,
  Step,
} from "@/lib/types";
import { useWorkflowStore } from "@/store/workflowStore";

const methodOptions: HTTPRequestConfig["method"][] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const browserActionTypes: BrowserAction["type"][] = ["navigate", "fill", "click", "wait"];

export default function NodeEditor() {
  const steps = useWorkflowStore((s) => s.workflow.steps);
  const selectedStepId = useWorkflowStore((s) => s.selectedStepId);
  const branchTargets = useWorkflowStore((s) => s.branchTargets);
  const errors = useWorkflowStore((s) => s.errors);
  const activeCollectionId = useWorkflowStore((s) => s.activeCollectionId);
  const variablesState = useWorkflowStore((s) => s.variables);
  const updateStepConfig = useWorkflowStore((s) => s.updateStepConfig);
  const setBranchTarget = useWorkflowStore((s) => s.setBranchTarget);

  const step = steps.find((candidate) => candidate.id === selectedStepId);
  const selectedIndex = steps.findIndex((candidate) => candidate.id === selectedStepId);
  const variableRefs = buildVariableRefs(steps, selectedIndex, variablesState, activeCollectionId);

  if (!step) {
    return (
      <aside className="h-full border-l border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-950">Select a step</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Choose a workflow step to edit its typed configuration.
        </p>
      </aside>
    );
  }

  const stepIssues = errors.filter((issue) => issue.stepId === step.id);

  return (
    <aside className="flex h-full flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step editor</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-950">{nodeMeta[step.type].label}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{nodeMeta[step.type].description}</p>
      </div>
      <div className="scrollbar-auto-hide flex-1 space-y-5 overflow-y-auto p-5">
        {stepIssues.length > 0 && (
          <div className="rounded border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900">Needs attention</p>
            <ul className="mt-2 space-y-1 text-sm leading-5 text-amber-800">
              {stepIssues.map((issue, index) => (
                <li key={`${issue.message}-${index}`}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}

        {step.type === "http_request" && (
          <HTTPRequestEditor
            config={step.config}
            variables={variableRefs}
            onChange={(config) => updateStepConfig(step.id, "http_request", config)}
          />
        )}

        {step.type === "extract" && (
          <ExtractEditor
            config={step.config}
            onChange={(config) => updateStepConfig(step.id, "extract", config)}
          />
        )}

        {step.type === "condition" && (
          <ConditionEditor
            config={step.config}
            steps={steps}
            currentStepId={step.id}
            targets={branchTargets[step.id] ?? {}}
            onConfigChange={(config) => updateStepConfig(step.id, "condition", config)}
            onTargetChange={(branch, targetId) => setBranchTarget(step.id, branch, targetId)}
          />
        )}

        {step.type === "form_submit" && (
          <FormSubmitEditor
            config={step.config}
            variables={variableRefs}
            onChange={(config) => updateStepConfig(step.id, "form_submit", config)}
          />
        )}

        {step.type === "browser" && (
          <BrowserEditor
            config={step.config}
            variables={variableRefs}
            onChange={(config) => updateStepConfig(step.id, "browser", config)}
          />
        )}
      </div>
    </aside>
  );
}

function HTTPRequestEditor({
  config,
  variables,
  onChange,
}: {
  config: HTTPRequestConfig;
  variables: string[];
  onChange: (config: HTTPRequestConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="field-label">Method</span>
        <select
          value={config.method}
          onChange={(event) => onChange({ ...config, method: event.target.value as HTTPRequestConfig["method"] })}
          className="input-control"
        >
          {methodOptions.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
      </label>
      <VariableTextField
        label="URL"
        value={config.url}
        variables={variables}
        onChange={(url) => onChange({ ...config, url })}
      />
      <KeyValueEditor
        title="Headers"
        value={config.headers}
        variables={variables}
        onChange={(headers) => onChange({ ...config, headers })}
      />
      <KeyValueEditor
        title="Body"
        value={config.body}
        variables={variables}
        onChange={(body) => onChange({ ...config, body })}
      />
      <div className="rounded border border-slate-200 p-3">
        <p className="text-sm font-semibold text-slate-950">CSRF helper</p>
        <div className="mt-3 space-y-3">
          <VariableTextField
            label="Fetch URL"
            value={config.csrf_fetch_url}
            variables={variables}
            onChange={(csrf_fetch_url) => onChange({ ...config, csrf_fetch_url })}
          />
          <TextField
            label="Token selector"
            value={config.csrf_selector}
            onChange={(csrf_selector) => onChange({ ...config, csrf_selector })}
          />
          <TextField
            label="Body field name"
            value={config.csrf_field_name}
            onChange={(csrf_field_name) => onChange({ ...config, csrf_field_name })}
          />
        </div>
      </div>
    </div>
  );
}

function ExtractEditor({
  config,
  onChange,
}: {
  config: ExtractConfig;
  onChange: (config: ExtractConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="field-label">Format</span>
        <select value={config.format} disabled className="input-control bg-slate-50 text-slate-500">
          <option value="html">HTML</option>
        </select>
      </label>
      <KeyValueEditor
        title="Extraction rules"
        keyPlaceholder="variable name"
        valuePlaceholder="CSS selector"
        value={config.rules}
        onChange={(rules) => onChange({ ...config, rules })}
      />
    </div>
  );
}

function ConditionEditor({
  config,
  steps,
  currentStepId,
  targets,
  onConfigChange,
  onTargetChange,
}: {
  config: ConditionConfig;
  steps: Step[];
  currentStepId: string;
  targets: { trueStepId?: string; falseStepId?: string };
  onConfigChange: (config: ConditionConfig) => void;
  onTargetChange: (branch: "trueStepId" | "falseStepId", targetId: string) => void;
}) {
  const targetOptions = steps.filter((step) => step.id !== currentStepId);

  return (
    <div className="space-y-4">
      <TextField
        label="Extracted field"
        value={config.field}
        onChange={(field) => onConfigChange({ ...config, field })}
      />
      <label className="block">
        <span className="field-label">Operator</span>
        <select value={config.op} className="input-control" onChange={() => undefined}>
          <option value="equals">equals</option>
        </select>
      </label>
      <TextField label="Value" value={config.value} onChange={(value) => onConfigChange({ ...config, value })} />
      <BranchSelect
        label="True branch"
        value={targets.trueStepId ?? ""}
        steps={targetOptions}
        onChange={(targetId) => onTargetChange("trueStepId", targetId)}
      />
      <BranchSelect
        label="False branch"
        value={targets.falseStepId ?? ""}
        steps={targetOptions}
        onChange={(targetId) => onTargetChange("falseStepId", targetId)}
      />
    </div>
  );
}

function FormSubmitEditor({
  config,
  variables,
  onChange,
}: {
  config: FormSubmitConfig;
  variables: string[];
  onChange: (config: FormSubmitConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <TextField
        label="Form selector"
        value={config.form_selector}
        onChange={(form_selector) => onChange({ ...config, form_selector })}
      />
      <VariableTextField
        label="Base URL"
        value={config.base_url}
        variables={variables}
        onChange={(base_url) => onChange({ ...config, base_url })}
      />
      <KeyValueEditor
        title="Overrides"
        keyPlaceholder="field name"
        valuePlaceholder="{{input.email}}"
        value={config.overrides}
        variables={variables}
        onChange={(overrides) => onChange({ ...config, overrides })}
      />
    </div>
  );
}

function BrowserEditor({
  config,
  variables,
  onChange,
}: {
  config: { actions: BrowserAction[] };
  variables: string[];
  onChange: (config: { actions: BrowserAction[] }) => void;
}) {
  const updateAction = (index: number, next: BrowserAction) => {
    onChange({ actions: config.actions.map((action, actionIndex) => (actionIndex === index ? next : action)) });
  };

  return (
    <div className="space-y-4">
      {config.actions.map((action, index) => (
        <div key={index} className="rounded border border-slate-200 p-3">
          <div className="flex items-center justify-between gap-2">
            <label className="block flex-1">
              <span className="field-label">Action</span>
              <select
                value={action.type}
                onChange={(event) => updateAction(index, { type: event.target.value as BrowserAction["type"] })}
                className="input-control"
              >
                {browserActionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-6">
              <IconButton
                label="Remove browser action"
                icon="trash"
                tone="danger"
                onClick={() => onChange({ actions: config.actions.filter((_, actionIndex) => actionIndex !== index) })}
              />
            </div>
          </div>
          <div className="mt-3 space-y-3">
            {action.type === "navigate" && (
              <VariableTextField
                label="URL"
                value={action.url ?? ""}
                variables={variables}
                onChange={(url) => updateAction(index, { ...action, url })}
              />
            )}
            {["fill", "click", "wait"].includes(action.type) && (
              <TextField
                label="Selector"
                value={action.selector ?? ""}
                onChange={(selector) => updateAction(index, { ...action, selector })}
              />
            )}
            {action.type === "fill" && (
              <VariableTextField
                label="Value"
                value={action.value ?? ""}
                variables={variables}
                onChange={(value) => updateAction(index, { ...action, value })}
              />
            )}
          </div>
        </div>
      ))}
      <div className="flex justify-center rounded border border-dashed border-slate-300 py-2">
        <IconButton
          label="Add browser action"
          icon="plus"
          tone="primary"
          onClick={() => onChange({ actions: [...config.actions, { type: "navigate", url: "" }] })}
        />
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="input-control" />
    </label>
  );
}

function VariableTextField({
  label,
  value,
  variables,
  onChange,
}: {
  label: string;
  value: string;
  variables: string[];
  onChange: (value: string) => void;
}) {
  return (
    <VariableInput label={label} value={value} variables={variables} onChange={onChange} />
  );
}

function VariableInput({
  label,
  value,
  variables,
  onChange,
  placeholder,
}: {
  label?: string;
  value: string;
  variables: string[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visibleVariables = variables.filter((variable) =>
    variable.toLowerCase().includes(query.trim().toLowerCase())
  );
  const tooltip = buildVariableTooltip(value);

  const updateValue = (nextValue: string) => {
    onChange(nextValue);
    if (nextValue.endsWith("{{")) {
      setOpen(true);
      setQuery("");
    }
  };

  const insertVariable = (variable: string) => {
    const nextValue = value.endsWith("{{")
      ? `${value.slice(0, -2)}${variable}`
      : `${value}${variable}`;
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
    <label className="relative block">
      {label ? <span className="field-label">{label}</span> : null}
      <input
        value={value}
        placeholder={placeholder}
        title={tooltip}
        onChange={(event) => updateValue(event.target.value)}
        className="input-control pr-9"
      />
      <button
        type="button"
        aria-label="Insert variable"
        title="Insert variable"
        onClick={() => setOpen((current) => !current)}
        className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded text-slate-400 transition hover:bg-blue-50 hover:text-blue-700"
      >
        <Icon name="braces" className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-[80] mt-1 w-72 overflow-hidden rounded border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 p-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search variables"
              className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-blue-400"
            />
          </div>
          <div className="max-h-56 overflow-auto p-1">
            {visibleVariables.length ? (
              visibleVariables.map((variable) => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => insertVariable(variable)}
                  className="block w-full rounded px-2 py-2 text-left hover:bg-slate-50"
                >
                  <code className="text-xs font-semibold text-slate-800">{variable}</code>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {describeVariable(variable)}
                  </span>
                </button>
              ))
            ) : (
              <p className="p-3 text-sm text-slate-500">No variables match your search.</p>
            )}
          </div>
        </div>
      ) : null}
    </label>
  );
}

function KeyValueEditor({
  title,
  value,
  variables = [],
  keyPlaceholder = "key",
  valuePlaceholder = "value",
  onChange,
}: {
  title: string;
  value: Record<string, string>;
  variables?: string[];
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  onChange: (value: Record<string, string>) => void;
}) {
  const entries = Object.entries(value);
  const [mode, setMode] = useState<"rows" | "json" | "delimited">("rows");
  const [importText, setImportText] = useState("");
  const [keyValueSeparator, setKeyValueSeparator] = useState(":");
  const [pairSeparator, setPairSeparator] = useState("\\n");
  const [importError, setImportError] = useState<string | null>(null);

  const updateEntry = (index: number, key: string, entryValue: string) => {
    const nextEntries = entries.map(([currentKey, currentValue], entryIndex) =>
      entryIndex === index ? [key, entryValue] : [currentKey, currentValue]
    );
    onChange(Object.fromEntries(nextEntries));
  };

  const applyImport = () => {
    try {
      const imported =
        mode === "json"
          ? parseKeyValueJSON(importText)
          : parseDelimitedKeyValues(importText, keyValueSeparator, pairSeparator);
      onChange(imported);
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Could not import key/value data.");
    }
  };

  return (
    <div className="rounded border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-slate-200 bg-slate-50 p-0.5">
            <KeyValueModeButton active={mode === "rows"} onClick={() => setMode("rows")}>
              Rows
            </KeyValueModeButton>
            <KeyValueModeButton active={mode === "json"} onClick={() => setMode("json")}>
              JSON
            </KeyValueModeButton>
            <KeyValueModeButton active={mode === "delimited"} onClick={() => setMode("delimited")}>
              Text
            </KeyValueModeButton>
          </div>
          <IconButton label={`Add ${title}`} icon="plus" tone="primary" onClick={() => onChange({ ...value, "": "" })} />
        </div>
      </div>

      {mode === "rows" ? (
        <div className="mt-3 space-y-3">
          {entries.length === 0 && <p className="text-sm text-slate-500">No entries yet.</p>}
          {entries.map(([key, entryValue], index) => (
            <div key={`${key}-${index}`} className="space-y-2">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <VariableInput
                  value={key}
                  placeholder={keyPlaceholder}
                  variables={variables}
                  onChange={(nextKey) => updateEntry(index, nextKey, entryValue)}
                />
                <VariableInput
                  value={entryValue}
                  placeholder={valuePlaceholder}
                  variables={variables}
                  onChange={(nextValue) => updateEntry(index, key, nextValue)}
                />
                <IconButton
                  label={`Remove ${title} row`}
                  icon="trash"
                  tone="danger"
                  onClick={() => onChange(Object.fromEntries(entries.filter((_, entryIndex) => entryIndex !== index)))}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {mode === "delimited" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">Key/value separator</span>
                <input
                  value={keyValueSeparator}
                  onChange={(event) => setKeyValueSeparator(event.target.value)}
                  placeholder=":"
                  className="input-control"
                />
              </label>
              <label className="block">
                <span className="field-label">Pair separator</span>
                <input
                  value={pairSeparator}
                  onChange={(event) => setPairSeparator(event.target.value)}
                  placeholder="\\n"
                  className="input-control"
                />
              </label>
            </div>
          )}
          <label className="block">
            <span className="field-label">
              {mode === "json" ? "JSON object" : "Delimited key/value text"}
            </span>
            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder={
                mode === "json"
                  ? '{\n  "Authorization": "Bearer token"\n}'
                  : "Authorization:Bearer token\\nContent-Type:application/json"
              }
              className="min-h-32 w-full rounded border border-slate-200 bg-white p-3 font-mono text-xs leading-5 text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          {importError && <p className="text-sm text-red-700">{importError}</p>}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={applyImport}
              className="rounded bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Import {title}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function KeyValueModeButton({
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
        "rounded px-2 py-1 text-xs font-semibold transition",
        active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-950",
      ].join(" ")}
    >
      {children}
    </button>
  );
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
  return value
    .replaceAll("\\n", "\n")
    .replaceAll("\\t", "\t");
}

function stringifyImportedValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function BranchSelect({
  label,
  value,
  steps,
  onChange,
}: {
  label: string;
  value: string;
  steps: Step[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="input-control">
        <option value="">Choose target</option>
        {steps.map((step) => (
          <option key={step.id} value={step.id}>
            {nodeMeta[step.type].label} - {step.id}
          </option>
        ))}
      </select>
    </label>
  );
}

function buildVariableRefs(
  steps: Step[],
  selectedIndex: number,
  variables: EnvironmentVariableSet,
  activeCollectionId?: string
): string[] {
  const refs = ["{{input.email}}", "{{input.password}}", "{{input.name}}", "{{input.message}}", "{{var.someKey}}"];
  const activeEnvironment = variables.activeEnvironment;
  const tenantVariables = variables.tenant[activeEnvironment] ?? {};
  const collectionVariables = activeCollectionId
    ? variables.collections[activeCollectionId]?.[activeEnvironment] ?? {}
    : {};
  Object.keys({ ...tenantVariables, ...collectionVariables }).forEach((name) => refs.push(`{{var.${name}}}`));
  steps.slice(0, Math.max(selectedIndex, 0)).forEach((step) => {
    if (step.type === "extract") {
      Object.keys(step.config.rules).forEach((name) => refs.push(`{{extract.${name}}}`));
    }
  });
  return Array.from(new Set(refs));
}

function buildVariableTooltip(value: string) {
  const refs = extractVariableRefs(value);
  if (!refs.length) return undefined;
  return refs.map((ref) => `${ref}: ${describeVariable(ref)}`).join("\n");
}

function extractVariableRefs(value: string) {
  return Array.from(value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g), (match) => `{{${match[1].trim()}}}`);
}

function describeVariable(variable: string) {
  const ref = variable.replace(/[{}]/g, "").trim();
  const [namespace, key] = ref.split(".");
  if (namespace === "input") return `Runtime input value for "${key}".`;
  if (namespace === "extract") return `Extracted value "${key}" from a previous response.`;
  if (namespace === "var") return `Tenant or environment variable "${key}".`;
  return "Workflow variable.";
}
