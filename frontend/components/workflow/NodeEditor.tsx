"use client";

import { IconButton } from "@/components/ui/IconButton";
import { nodeMeta } from "@/lib/nodeMeta";
import type {
  BrowserAction,
  ConditionConfig,
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
  const updateStepConfig = useWorkflowStore((s) => s.updateStepConfig);
  const setBranchTarget = useWorkflowStore((s) => s.setBranchTarget);

  const step = steps.find((candidate) => candidate.id === selectedStepId);
  const selectedIndex = steps.findIndex((candidate) => candidate.id === selectedStepId);
  const variableRefs = buildVariableRefs(steps, selectedIndex);

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

        <VariablePanel refs={variableRefs} />

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
    <div>
      <TextField label={label} value={value} onChange={onChange} />
      <VariableButtons variables={variables} onInsert={(variable) => onChange(`${value}${variable}`)} />
    </div>
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

  const updateEntry = (index: number, key: string, entryValue: string) => {
    const nextEntries = entries.map(([currentKey, currentValue], entryIndex) =>
      entryIndex === index ? [key, entryValue] : [currentKey, currentValue]
    );
    onChange(Object.fromEntries(nextEntries));
  };

  return (
    <div className="rounded border border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        <IconButton label={`Add ${title}`} icon="plus" tone="primary" onClick={() => onChange({ ...value, "": "" })} />
      </div>
      <div className="mt-3 space-y-3">
        {entries.length === 0 && <p className="text-sm text-slate-500">No entries yet.</p>}
        {entries.map(([key, entryValue], index) => (
          <div key={`${key}-${index}`} className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input
                value={key}
                placeholder={keyPlaceholder}
                onChange={(event) => updateEntry(index, event.target.value, entryValue)}
                className="input-control"
              />
              <input
                value={entryValue}
                placeholder={valuePlaceholder}
                onChange={(event) => updateEntry(index, key, event.target.value)}
                className="input-control"
              />
              <IconButton
                label={`Remove ${title} row`}
                icon="trash"
                tone="danger"
                onClick={() => onChange(Object.fromEntries(entries.filter((_, entryIndex) => entryIndex !== index)))}
              />
            </div>
            <VariableButtons
              variables={variables}
              onInsert={(variable) => updateEntry(index, key, `${entryValue}${variable}`)}
            />
          </div>
        ))}
      </div>
    </div>
  );
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

function VariablePanel({ refs }: { refs: string[] }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-950">Available variables</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {refs.map((ref) => (
          <code key={ref} className="rounded bg-white px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
            {ref}
          </code>
        ))}
      </div>
    </div>
  );
}

function VariableButtons({
  variables,
  onInsert,
}: {
  variables: string[];
  onInsert: (variable: string) => void;
}) {
  if (variables.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {variables.slice(0, 8).map((variable) => (
        <button
          key={variable}
          type="button"
          onClick={() => onInsert(variable)}
          className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
        >
          Insert {variable}
        </button>
      ))}
    </div>
  );
}

function buildVariableRefs(steps: Step[], selectedIndex: number): string[] {
  const refs = ["{{input.email}}", "{{input.password}}", "{{input.name}}", "{{input.message}}", "{{var.someKey}}"];
  steps.slice(0, Math.max(selectedIndex, 0)).forEach((step) => {
    if (step.type === "extract") {
      Object.keys(step.config.rules).forEach((name) => refs.push(`{{extract.${name}}}`));
    }
  });
  return Array.from(new Set(refs));
}
