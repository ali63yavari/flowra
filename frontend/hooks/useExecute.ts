"use client";

import { executeDirect, type ExecutionInput } from "@/lib/api";
import { nodeMeta } from "@/lib/nodeMeta";
import type { EnvironmentVariableSet, ExecutionConsoleEntry, ExecutionTraceEntry } from "@/lib/types";
import { useWorkflowStore } from "@/store/workflowStore";

export function useExecute() {
  const buildDSL = useWorkflowStore((s) => s.buildDSL);
  const buildDSLUntilStep = useWorkflowStore((s) => s.buildDSLUntilStep);
  const validate = useWorkflowStore((s) => s.validate);
  const execution = useWorkflowStore((s) => s.execution);
  const steps = useWorkflowStore((s) => s.workflow.steps);
  const variables = useWorkflowStore((s) => s.variables);
  const activeCollectionId = useWorkflowStore((s) => s.activeCollectionId);
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
      const executionVariables = getExecutionVariables(variables, activeCollectionId);
      setExecutionResult({ lastWorkflow: workflow });
      const res = await executeDirect(workflow, input, executionVariables);

      if (res.status === "error") {
        const result = res.result;
        setExecutionResult({
          error: res.error,
          result: result?.data ?? res.data ?? null,
          input: result?.input ?? res.input ?? input,
          variables: result?.variables ?? res.variables ?? null,
          extracted: result?.extracted ?? res.extracted ?? null,
          lastResponse: result?.last_response ?? res.last_response ?? null,
          traces: result?.traces ?? res.traces ?? [],
        });
        addConsoleEntry({
          title: "Workflow run",
          status: "error",
          error: res.error,
          input,
          variables: result?.variables ?? res.variables,
          extracted: result?.extracted ?? res.extracted,
          response: result?.last_response ?? res.last_response,
        });
        setExecutionStatus("failed");
      } else {
        setExecutionResult({
          result: res.data,
          error: null,
          input: res.input ?? input,
          variables: res.variables ?? null,
          extracted: res.extracted ?? null,
          lastResponse: res.last_response ?? null,
          traces: res.traces ?? [],
        });
        addTraceConsoleEntries(res.traces, addConsoleEntry);
        addConsoleEntry({
          title: "Workflow run",
          status: "success",
          output: res.data,
          input: res.input ?? input,
          variables: res.variables,
          extracted: res.extracted,
          response: res.last_response,
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
      const executionVariables = getExecutionVariables(variables, activeCollectionId);
      setExecutionResult({ lastWorkflow: workflow });
      const res = await executeDirect(workflow, input, executionVariables);

      if (res.status === "error") {
        const result = res.result;
        setExecutionResult({
          error: res.error,
          result: result?.data ?? res.data ?? null,
          input: result?.input ?? res.input ?? input,
          variables: result?.variables ?? res.variables ?? null,
          extracted: result?.extracted ?? res.extracted ?? null,
          lastResponse: result?.last_response ?? res.last_response ?? null,
          traces: result?.traces ?? res.traces ?? [],
        });
        addTraceConsoleEntries(result?.traces ?? res.traces, addConsoleEntry);
        addConsoleEntry({
          stepId,
          title,
          status: "error",
          error: res.error,
          input,
          variables: result?.variables ?? res.variables,
          extracted: result?.extracted ?? res.extracted,
          response: result?.last_response ?? res.last_response,
        });
        setExecutionStatus("failed", { failedStepId: stepId });
      } else {
        setExecutionResult({
          result: res.data,
          error: null,
          input: res.input ?? input,
          variables: res.variables ?? null,
          extracted: res.extracted ?? null,
          lastResponse: res.last_response ?? null,
          traces: res.traces ?? [],
        });
        addTraceConsoleEntries(res.traces, addConsoleEntry);
        addConsoleEntry({
          stepId,
          title,
          status: "success",
          output: res.data,
          input: res.input ?? input,
          variables: res.variables,
          extracted: res.extracted,
          response: res.last_response,
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

function getExecutionVariables(
  variables: EnvironmentVariableSet,
  activeCollectionId?: string
) {
  const environment = variables.activeEnvironment;
  return {
    environment,
    tenantVariables: variables.tenant[environment] ?? {},
    collectionVariables: activeCollectionId
      ? variables.collections[activeCollectionId]?.[environment] ?? {}
      : {},
    trace: true,
  };
}

function addTraceConsoleEntries(
  traces: ExecutionTraceEntry[] | undefined,
  addConsoleEntry: (entry: Omit<ExecutionConsoleEntry, "id" | "createdAt">) => void
) {
  traces?.forEach((trace) => {
    addConsoleEntry({
      stepId: trace.step_id,
      title: `${nodeMeta[trace.type as keyof typeof nodeMeta]?.label ?? trace.type} trace`,
      status: trace.status,
      method: trace.request?.method,
      url: trace.request?.url,
      statusCode: trace.response?.status_code,
      durationMs: trace.duration_ms,
      request: trace.request,
      response: trace.response,
      input: trace.input,
      variables: trace.variables,
      extracted: trace.extracted,
      trace,
      output: trace.response?.parsed_body ?? trace.response?.body ?? parsePreview(trace.output_preview),
      error: trace.error,
    });
  });
}

function parsePreview(value?: string) {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
