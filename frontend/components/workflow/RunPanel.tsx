"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { useExecute } from "@/hooks/useExecute";
import type { ExecutionConsoleEntry } from "@/lib/types";
import { useWorkflowStore } from "@/store/workflowStore";

const EMPTY_CONSOLE_ENTRIES: ExecutionConsoleEntry[] = [];

export default function RunPanel() {
  const { run, loading, status, result, error, lastWorkflow } = useExecute();
  const activeWorkflowId = useWorkflowStore((s) => s.activeWorkflowId);
  const errors = useWorkflowStore((s) => s.errors);
  const consoleEntries = useWorkflowStore((s) => s.execution.consoleEntries ?? EMPTY_CONSOLE_ENTRIES);
  const clearConsoleEntries = useWorkflowStore((s) => s.clearConsoleEntries);
  const [activeTab, setActiveTab] = useState<"workflow" | "console">("workflow");
  const [inputText, setInputText] = useState('{\n  "email": "test@test.com",\n  "password": "123456"\n}');
  const [inputError, setInputError] = useState<string | null>(null);

  const hasBlockingErrors = errors.some((issue) => issue.severity === "error");

  const handleRun = async () => {
    if (!activeWorkflowId) {
      setInputError("Select or create a workflow before running.");
      return;
    }
    try {
      const parsed = JSON.parse(inputText) as Record<string, string | number | boolean | null>;
      setInputError(null);
      await run(parsed);
    } catch {
      setInputError("Input must be valid JSON.");
    }
  };

  return (
    <section className="rounded border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Execution</p>
          <h2 className="mt-1 text-sm font-semibold text-slate-950">Status: {status}</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded border border-slate-200 bg-slate-50 p-0.5">
            <TabButton active={activeTab === "workflow"} onClick={() => setActiveTab("workflow")}>
              Workflow output
            </TabButton>
            <TabButton active={activeTab === "console"} onClick={() => setActiveTab("console")}>
              Console
            </TabButton>
          </div>
          <IconButton
            label={loading ? "Workflow is running" : "Run workflow"}
            icon="play"
            tone="success"
            onClick={handleRun}
            disabled={loading || hasBlockingErrors || !activeWorkflowId}
          />
        </div>
      </div>

      {activeTab === "workflow" ? (
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <label className="block">
            <span className="field-label">Input JSON</span>
            <textarea
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              className="min-h-40 w-full rounded border border-slate-200 bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            {inputError && <span className="mt-2 block text-sm text-red-700">{inputError}</span>}
            {hasBlockingErrors && (
              <span className="mt-2 block text-sm text-amber-700">
                Run is disabled while blocking validation errors exist.
              </span>
            )}
          </label>

          <div className="space-y-3">
            {error && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
                {error}
              </div>
            )}
            {result && <ResultBlock title="Returned data" value={result} />}
            {lastWorkflow && <ResultBlock title="Executed DSL" value={lastWorkflow} />}
            {!error && !result && !lastWorkflow && (
              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-500">
                {activeWorkflowId
                  ? "Run the workflow to see backend output and the exact DSL sent to `/execute-direct`."
                  : "Select or create a workflow before running."}
              </div>
            )}
          </div>
        </div>
      ) : (
        <ConsolePanel entries={consoleEntries} onClear={clearConsoleEntries} />
      )}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
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

function ResultBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="rounded border border-slate-200">
      <div className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <pre className="max-h-64 overflow-auto bg-slate-950 p-3 text-xs leading-5 text-emerald-100">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function ConsolePanel({
  entries,
  onClear,
}: {
  entries: ExecutionConsoleEntry[];
  onClear: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(entries[0]?.id ?? null);
  const selected = entries.find((entry) => entry.id === selectedId) ?? entries[0];

  return (
    <div className="grid min-h-[360px] gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="rounded border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Request runs</p>
          <IconButton
            label="Clear console"
            icon="trash"
            tone="danger"
            className="h-7 w-7 rounded-sm [&_svg]:h-3.5 [&_svg]:w-3.5"
            onClick={onClear}
          />
        </div>
        <div className="max-h-[420px] overflow-auto p-2">
          {entries.length === 0 ? (
            <p className="p-3 text-sm leading-6 text-slate-500">
              Execute a request from a request card to see its output here.
            </p>
          ) : (
            <div className="space-y-1">
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedId(entry.id)}
                  className={[
                    "w-full rounded px-3 py-2 text-left transition",
                    selected?.id === entry.id ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span
                      className={[
                        "h-2 w-2 rounded-full",
                        entry.status === "success" ? "bg-emerald-500" : "bg-red-500",
                      ].join(" ")}
                    />
                    {entry.title}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {new Date(entry.createdAt).toLocaleTimeString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded border border-slate-200">
        {selected ? (
          <ResponseViewer entry={selected} />
        ) : (
          <div className="flex h-full min-h-72 items-center justify-center p-6 text-sm text-slate-500">
            No request output selected.
          </div>
        )}
      </div>
    </div>
  );
}

function ResponseViewer({ entry }: { entry: ExecutionConsoleEntry }) {
  const output = entry.status === "error" ? entry.error : entry.output;
  const format = detectOutputFormat(output);
  const [mode, setMode] = useState<"auto" | "raw" | "json" | "html" | "table">("auto");
  const resolvedMode = mode === "auto" ? format : mode;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <div>
          <p className="text-sm font-semibold text-slate-950">{entry.title}</p>
          <p className="text-xs text-slate-500">{entry.status}</p>
        </div>
        <div className="flex items-center gap-1">
          {(["auto", "json", "table", "html", "raw"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={[
                "rounded px-2 py-1 text-xs font-semibold capitalize",
                mode === item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              ].join(" ")}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-72 bg-white">
        {resolvedMode === "html" ? (
          <HtmlPreview value={output} />
        ) : resolvedMode === "table" ? (
          <TablePreview value={output} />
        ) : resolvedMode === "json" ? (
          <pre className="max-h-[480px] overflow-auto bg-slate-950 p-3 text-xs leading-5 text-emerald-100">
            {stringifyPretty(output)}
          </pre>
        ) : (
          <pre className="max-h-[480px] overflow-auto bg-slate-950 p-3 text-xs leading-5 text-slate-100">
            {stringifyRaw(output)}
          </pre>
        )}
      </div>
    </div>
  );
}

function detectOutputFormat(value: unknown): "raw" | "json" | "html" | "table" {
  if (Array.isArray(value) && value.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
    return "table";
  }
  if (value && typeof value === "object") return "json";
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html")) return "html";
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
    if (trimmed.startsWith("<soap") || trimmed.startsWith("<?xml") || trimmed.includes("<soap:envelope")) return "raw";
  }
  return "raw";
}

function HtmlPreview({ value }: { value: unknown }) {
  const html = typeof value === "string" ? value : stringifyRaw(value);
  return <iframe title="HTML response preview" srcDoc={html} className="h-[480px] w-full bg-white" />;
}

function TablePreview({ value }: { value: unknown }) {
  const rows = Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row as Record<string, unknown>))));

  if (!rows.length || !columns.length) {
    return <pre className="p-3 text-xs leading-5 text-slate-700">{stringifyPretty(value)}</pre>;
  }

  return (
    <div className="max-h-[480px] overflow-auto">
      <table className="w-full min-w-max border-collapse text-left text-xs">
        <thead className="sticky top-0 bg-slate-50 text-slate-600">
          <tr>
            {columns.map((column) => (
              <th key={column} className="border-b border-slate-200 px-3 py-2 font-semibold">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="odd:bg-white even:bg-slate-50/70">
              {columns.map((column) => (
                <td key={column} className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  {stringifyCell((row as Record<string, unknown>)[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function stringifyPretty(value: unknown) {
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
}

function stringifyRaw(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function stringifyCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
