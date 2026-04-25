"use client";

import { useState } from "react";
import { executeDirect, type ExecutionInput } from "@/lib/api";
import { useWorkflowStore } from "@/store/workflowStore";
import type { WorkflowDefinition } from "@/lib/types";

export function useExecute() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastWorkflow, setLastWorkflow] = useState<WorkflowDefinition | null>(null);

  const buildDSL = useWorkflowStore((s) => s.buildDSL);
  const validate = useWorkflowStore((s) => s.validate);
  const executionStatus = useWorkflowStore((s) => s.execution.status);
  const setExecutionStatus = useWorkflowStore((s) => s.setExecutionStatus);

  const run = async (input: ExecutionInput) => {
    setExecutionStatus("validating");
    const issues = validate();
    if (issues.some((issue) => issue.severity === "error")) {
      setError("Fix validation errors before running.");
      setResult(null);
      setExecutionStatus("failed");
      return;
    }

    setExecutionStatus("running");
    setResult(null);
    setError(null);

    try {
      const workflow = buildDSL();
      setLastWorkflow(workflow);
      const res = await executeDirect(workflow, input);

      if (res.status === "error") {
        setError(res.error);
        setExecutionStatus("failed");
      } else {
        setResult(res.data);
        setExecutionStatus("success");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Execution failed.");
      setExecutionStatus("failed");
    }
  };

  return {
    run,
    loading: executionStatus === "validating" || executionStatus === "running",
    status: executionStatus,
    result,
    error,
    lastWorkflow,
  };
}
