"use client";

import { executeDirect, type ExecutionInput } from "@/lib/api";
import { useWorkflowStore } from "@/store/workflowStore";

export function useExecute() {
  const buildDSL = useWorkflowStore((s) => s.buildDSL);
  const validate = useWorkflowStore((s) => s.validate);
  const execution = useWorkflowStore((s) => s.execution);
  const setExecutionStatus = useWorkflowStore((s) => s.setExecutionStatus);
  const setExecutionResult = useWorkflowStore((s) => s.setExecutionResult);

  const run = async (input: ExecutionInput) => {
    setExecutionStatus("validating");
    const issues = validate();
    if (issues.some((issue) => issue.severity === "error")) {
      setExecutionResult({
        error: "Fix validation errors before running.",
        result: null,
      });
      setExecutionStatus("failed");
      return;
    }

    setExecutionStatus("running");
    setExecutionResult({ result: null, error: null });

    try {
      const workflow = buildDSL();
      setExecutionResult({ lastWorkflow: workflow });
      const res = await executeDirect(workflow, input);

      if (res.status === "error") {
        setExecutionResult({ error: res.error, result: null });
        setExecutionStatus("failed");
      } else {
        setExecutionResult({ result: res.data, error: null });
        setExecutionStatus("success");
      }
    } catch (e: unknown) {
      setExecutionResult({
        error: e instanceof Error ? e.message : "Execution failed.",
        result: null,
      });
      setExecutionStatus("failed");
    }
  };

  return {
    run,
    loading: execution.status === "validating" || execution.status === "running",
    status: execution.status,
    result: execution.result ?? null,
    error: execution.error ?? null,
    lastWorkflow: execution.lastWorkflow ?? null,
  };
}
