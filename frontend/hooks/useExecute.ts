"use client";

import { executeDirect, type ExecutionInput } from "@/lib/api";
import { nodeMeta } from "@/lib/nodeMeta";
import { useWorkflowStore } from "@/store/workflowStore";

export function useExecute() {
  const buildDSL = useWorkflowStore((s) => s.buildDSL);
  const buildDSLUntilStep = useWorkflowStore((s) => s.buildDSLUntilStep);
  const validate = useWorkflowStore((s) => s.validate);
  const execution = useWorkflowStore((s) => s.execution);
  const steps = useWorkflowStore((s) => s.workflow.steps);
  const setExecutionStatus = useWorkflowStore((s) => s.setExecutionStatus);
  const setExecutionResult = useWorkflowStore((s) => s.setExecutionResult);
  const addConsoleEntry = useWorkflowStore((s) => s.addConsoleEntry);

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
        addConsoleEntry({
          title: "Workflow run",
          status: "error",
          error: res.error,
        });
        setExecutionStatus("failed");
      } else {
        setExecutionResult({ result: res.data, error: null });
        addConsoleEntry({
          title: "Workflow run",
          status: "success",
          output: res.data,
        });
        setExecutionStatus("success");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Execution failed.";
      setExecutionResult({
        error: message,
        result: null,
      });
      addConsoleEntry({
        title: "Workflow run",
        status: "error",
        error: message,
      });
      setExecutionStatus("failed");
    }
  };

  const runStep = async (stepId: string, input: ExecutionInput = {}) => {
    setExecutionStatus("running", { activeStepId: stepId });
    setExecutionResult({ result: null, error: null });

    try {
      const workflow = buildDSLUntilStep(stepId);
      const step = steps.find((candidate) => candidate.id === stepId);
      const title = step ? `${nodeMeta[step.type].label} request` : "Request run";
      setExecutionResult({ lastWorkflow: workflow });
      const res = await executeDirect(workflow, input);

      if (res.status === "error") {
        setExecutionResult({ error: res.error, result: null });
        addConsoleEntry({
          stepId,
          title,
          status: "error",
          error: res.error,
        });
        setExecutionStatus("failed", { failedStepId: stepId });
      } else {
        setExecutionResult({ result: res.data, error: null });
        addConsoleEntry({
          stepId,
          title,
          status: "success",
          output: res.data,
        });
        setExecutionStatus("success");
      }
    } catch (e: unknown) {
      const step = steps.find((candidate) => candidate.id === stepId);
      const title = step ? `${nodeMeta[step.type].label} request` : "Request run";
      const message = e instanceof Error ? e.message : "Execution failed.";
      setExecutionResult({
        error: message,
        result: null,
      });
      addConsoleEntry({
        stepId,
        title,
        status: "error",
        error: message,
      });
      setExecutionStatus("failed", { failedStepId: stepId });
    }
  };

  return {
    run,
    runStep,
    loading: execution.status === "validating" || execution.status === "running",
    status: execution.status,
    result: execution.result ?? null,
    error: execution.error ?? null,
    lastWorkflow: execution.lastWorkflow ?? null,
  };
}
