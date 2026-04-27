"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { useExecute } from "@/hooks/useExecute";
import {
  isObjectArray,
  parseExecutionResponse,
  parseResponseContent,
  stringifyPretty,
  stringifyRaw,
  tableColumns,
  type ParsedResponse,
  type ResponseFormat,
} from "@/lib/responseParsing";
import type { ExecutionConsoleEntry, ExecutionResponseDebug, ExecutionTraceEntry } from "@/lib/types";
import { useWorkflowStore } from "@/store/workflowStore";

const EMPTY_CONSOLE_ENTRIES: ExecutionConsoleEntry[] = [];

export default function RunPanel({
  inputText,
  inputError,
  onInputChange,
}: {
  inputText: string;
  inputError: string | null;
  onInputChange: (value: string) => void;
}) {
  const { status, result, error, lastWorkflow } = useExecute();
  const activeWorkflowId = useWorkflowStore((s) => s.activeWorkflowId);
  const activeEnvironment = useWorkflowStore((s) => s.variables.activeEnvironment);
  const execution = useWorkflowStore((s) => s.execution);
  const errors = useWorkflowStore((s) => s.errors);
  const consoleEntries = useWorkflowStore((s) => s.execution.consoleEntries ?? EMPTY_CONSOLE_ENTRIES);
  const clearConsoleEntries = useWorkflowStore((s) => s.clearConsoleEntries);
  const [activeTab, setActiveTab] = useState<"summary" | "console">("summary");

  const hasBlockingErrors = errors.some((issue) => issue.severity === "error");

  return (
    <section className="flex h-full min-h-0 flex-col rounded border border-slate-200 bg-white">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Execution</p>
          <h2 className="text-sm font-semibold text-slate-950">Status: {status}</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded border border-slate-200 bg-slate-50 p-0.5">
            <TabButton active={activeTab === "summary"} onClick={() => setActiveTab("summary")}>
              Run summary
            </TabButton>
            <TabButton active={activeTab === "console"} onClick={() => setActiveTab("console")}>
              Console
            </TabButton>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "summary" ? (
          <RunSummary
            activeWorkflowId={activeWorkflowId}
            activeEnvironment={activeEnvironment}
            inputText={inputText}
            inputError={inputError}
            hasBlockingErrors={hasBlockingErrors}
            onInputChange={onInputChange}
            error={error}
            result={result}
            lastResponse={execution.lastResponse}
            lastWorkflow={lastWorkflow}
            traces={execution.traces ?? []}
          />
        ) : (
          <ConsolePanel entries={consoleEntries} onClear={clearConsoleEntries} />
        )}
      </div>
    </section>
  );
}

function RunSummary({
  activeWorkflowId,
  activeEnvironment,
  inputText,
  inputError,
  hasBlockingErrors,
  onInputChange,
  error,
  result,
  lastResponse,
  lastWorkflow,
  traces,
}: {
  activeWorkflowId?: string;
  activeEnvironment: string;
  inputText: string;
  inputError: string | null;
  hasBlockingErrors: boolean;
  onInputChange: (value: string) => void;
  error: string | null;
  result: Record<string, unknown> | null;
  lastResponse?: ExecutionResponseDebug | null;
  lastWorkflow: unknown;
  traces: ExecutionTraceEntry[];
}) {
  const latestDuration = traces.reduce((total, trace) => total + Number(trace.duration_ms ?? 0), 0);

  return (
    <div className="grid h-full min-h-0 gap-4 overflow-auto p-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
      <div className="min-h-0 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <SummaryStat label="Environment" value={activeEnvironment} />
          <SummaryStat label="Duration" value={latestDuration ? `${latestDuration} ms` : "-"} />
        </div>
        <label className="block">
          <span className="field-label">Workflow input</span>
          <span className="mb-2 block text-xs leading-5 text-slate-500">
            This JSON is sent to the workflow and is available as <code>{"{{input.*}}"}</code>.
          </span>
          <textarea
            value={inputText}
            onChange={(event) => onInputChange(event.target.value)}
            className="h-56 w-full resize-none rounded border border-slate-200 bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          {inputError && <span className="mt-2 block text-sm text-red-700">{inputError}</span>}
          {hasBlockingErrors && (
            <span className="mt-2 block text-sm text-amber-700">
              Workflow run is disabled while blocking validation errors exist.
            </span>
          )}
        </label>
      </div>

      <div className="min-h-0 space-y-3 overflow-auto">
        {error && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
            {error}
          </div>
        )}
        {lastResponse ? (
          <ResponseCard title="Latest response body" response={lastResponse} />
        ) : !result ? (
          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-500">
            {activeWorkflowId
              ? "Run the workflow to inspect its response, extracted values, and debug payload."
              : "Select or create a workflow before running."}
          </div>
        ) : null}
        {result && <ResultBlock title="Workflow result" value={result} />}
        {Boolean(lastWorkflow) && (
          <details className="rounded border border-slate-200">
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Debug payload / executed DSL
            </summary>
            <pre className="max-h-56 overflow-auto bg-slate-950 p-3 text-xs leading-5 text-emerald-100">
              {JSON.stringify(lastWorkflow, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</p>
    </div>
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
      <pre className="max-h-56 overflow-auto bg-slate-950 p-3 text-xs leading-5 text-emerald-100">
        {stringifyPretty(value)}
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
    <div className="grid h-full min-h-0 gap-4 p-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col rounded border border-slate-200">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Request runs</p>
          <IconButton
            label="Clear console"
            icon="trash"
            tone="danger"
            className="h-7 w-7 rounded-sm [&_svg]:h-3.5 [&_svg]:w-3.5"
            onClick={onClear}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {entries.length === 0 ? (
            <p className="p-3 text-sm leading-6 text-slate-500">
              Execute a request step or workflow to see response details here.
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
                    selected?.id === entry.id ? "bg-blue-50 text-blue-900 ring-1 ring-blue-500" : "hover:bg-slate-50",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span
                      className={[
                        "h-2 w-2 rounded-full",
                        entry.status === "success" ? "bg-emerald-500" : "bg-red-500",
                      ].join(" ")}
                    />
                    <span className="truncate">{entry.title}</span>
                  </span>
                  <span className="mt-1 block truncate text-xs text-slate-500">
                    {[entry.method, entry.url].filter(Boolean).join(" ")}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    {entry.statusCode ? <span>HTTP {entry.statusCode}</span> : null}
                    {entry.durationMs !== undefined ? <span>{entry.durationMs} ms</span> : null}
                    <span>{new Date(entry.createdAt).toLocaleTimeString()}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 rounded border border-slate-200">
        {selected ? (
          <RequestInspector entry={selected} />
        ) : (
          <div className="flex h-full min-h-72 items-center justify-center p-6 text-sm text-slate-500">
            No request output selected.
          </div>
        )}
      </div>
    </div>
  );
}

function RequestInspector({ entry }: { entry: ExecutionConsoleEntry }) {
  const [tab, setTab] = useState<"response" | "headers" | "request" | "extracted" | "variables" | "trace" | "raw">(
    "response"
  );
  const response = entry.response;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-slate-200 px-3 py-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">{entry.title}</p>
            <p className="mt-1 truncate text-xs text-slate-500">
              {[entry.method, entry.url].filter(Boolean).join(" ") || entry.status}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {entry.statusCode ? <Badge>HTTP {entry.statusCode}</Badge> : null}
            {entry.durationMs !== undefined ? <Badge>{entry.durationMs} ms</Badge> : null}
            <Badge tone={entry.status === "success" ? "success" : "danger"}>{entry.status}</Badge>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {(["response", "headers", "request", "extracted", "variables", "trace", "raw"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={[
                "rounded px-2.5 py-1 text-xs font-semibold capitalize",
                tab === item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              ].join(" ")}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === "response" && <ResponseBody response={response} fallback={entry.output ?? entry.error} />}
        {tab === "headers" && <ResultBlock title="Response headers" value={response?.headers ?? {}} />}
        {tab === "request" && <ResultBlock title="Request" value={entry.request ?? {}} />}
        {tab === "extracted" && <ResultBlock title="Extracted values" value={entry.extracted ?? {}} />}
        {tab === "variables" && <ResultBlock title="Resolved variables" value={entry.variables ?? {}} />}
        {tab === "trace" && <ResultBlock title="Trace" value={entry.trace ?? entry} />}
        {tab === "raw" && <RawResponse response={response} fallback={entry.output ?? entry.error} />}
      </div>
    </div>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "danger"
        ? "bg-red-50 text-red-700"
        : "bg-slate-100 text-slate-600";
  return <span className={`rounded px-2 py-1 font-semibold ${toneClass}`}>{children}</span>;
}

function ResponseCard({ title, response }: { title: string; response: ExecutionResponseDebug }) {
  return (
    <div className="rounded border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <span className="text-xs font-semibold text-slate-500">HTTP {response.status_code}</span>
      </div>
      <ResponseBody response={response} />
    </div>
  );
}

function ResponseBody({
  response,
  fallback,
}: {
  response?: ExecutionResponseDebug;
  fallback?: unknown;
}) {
  const parsed = response
    ? parseExecutionResponse(response)
    : parseResponseContent({ body: fallback ?? "", contentType: "" });
  const defaultMode = parsed.format === "table" ? "table" : parsed.format === "invalid_json" ? "raw" : parsed.format;
  const [mode, setMode] = useState<ResponseFormat | "auto">("auto");
  const resolvedMode = mode === "auto" ? defaultMode : mode;
  const canShowTable = parsed.tableCapable;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="text-xs text-slate-500">
          <span className="font-semibold uppercase tracking-wide">{parsed.contentType || "unknown content"}</span>
          {parsed.parseError ? <span className="ml-2 text-red-700">{parsed.parseError}</span> : null}
        </div>
        <div className="flex items-center gap-1">
          {(["auto", "json", "table", "html", "xml", "raw"] as const).map((item) => (
            <button
              key={item}
              type="button"
              disabled={item === "table" && !canShowTable}
              onClick={() => setMode(item)}
              className={[
                "rounded px-2 py-1 text-xs font-semibold capitalize disabled:cursor-not-allowed disabled:opacity-40",
                mode === item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              ].join(" ")}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {resolvedMode === "html" ? (
        <iframe
          title="HTML response preview"
          sandbox=""
          srcDoc={parsed.raw}
          className="h-[420px] w-full bg-white"
        />
      ) : resolvedMode === "table" ? (
        <TablePreview parsed={parsed} />
      ) : resolvedMode === "json" ? (
        <CodeBlock tone="json" value={stringifyPretty(parsed.parsed ?? parsed.raw)} />
      ) : (
        <CodeBlock tone="raw" value={resolvedMode === "xml" ? parsed.raw : parsed.raw || stringifyRaw(fallback)} />
      )}
    </div>
  );
}

function RawResponse({
  response,
  fallback,
}: {
  response?: ExecutionResponseDebug;
  fallback?: unknown;
}) {
  return (
    <CodeBlock
      tone="raw"
      value={response?.body ?? stringifyRaw(fallback ?? "")}
    />
  );
}

function CodeBlock({ value, tone }: { value: string; tone: "json" | "raw" }) {
  return (
    <pre
      className={[
        "max-h-[520px] min-h-72 overflow-auto whitespace-pre-wrap break-words bg-slate-950 p-3 text-xs leading-5",
        tone === "json" ? "text-emerald-100" : "text-slate-100",
      ].join(" ")}
    >
      {value}
    </pre>
  );
}

function TablePreview({ parsed }: { parsed: ParsedResponse }) {
  const rows = isObjectArray(parsed.parsed) ? parsed.parsed : [];
  const columns = tableColumns(rows);

  if (!rows.length || !columns.length) {
    return <CodeBlock tone="json" value={stringifyPretty(parsed.parsed ?? parsed.raw)} />;
  }

  return (
    <div className="max-h-[520px] overflow-auto">
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
                  {stringifyCell(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function stringifyCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
