"use client";

import { useState } from "react";
import { useExecute } from "@/hooks/useExecute";
import { useWorkflowStore } from "@/store/workflowStore";

export default function RunPanel() {
  const { run, loading, status, result, error, lastWorkflow } = useExecute();
  const activeWorkflowId = useWorkflowStore((s) => s.activeWorkflowId);
  const validate = useWorkflowStore((s) => s.validate);
  const errors = useWorkflowStore((s) => s.errors);
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
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Execution</p>
          <h2 className="mt-1 text-sm font-semibold text-slate-950">Status: {status}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => validate()}
            className="rounded border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Validate
          </button>
          <button
            type="button"
            onClick={handleRun}
            disabled={loading || hasBlockingErrors || !activeWorkflowId}
            className="rounded bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? "Running" : "Run workflow"}
          </button>
        </div>
      </div>

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
          {result && (
            <ResultBlock title="Returned data" value={result} />
          )}
          {lastWorkflow && (
            <ResultBlock title="Executed DSL" value={lastWorkflow} />
          )}
          {!error && !result && !lastWorkflow && (
            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-500">
              {activeWorkflowId
                ? "Run the workflow to see backend output and the exact DSL sent to `/execute-direct`."
                : "Select or create a workflow before running."}
            </div>
          )}
        </div>
      </div>
    </section>
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
