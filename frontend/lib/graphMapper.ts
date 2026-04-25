import type { Edge, Node } from "reactflow";
import { nodeMeta } from "@/lib/nodeMeta";
import { summarizeStep } from "@/lib/stepSummary";
import type { BranchTargets, Step, ValidationIssue } from "@/lib/types";

export function mapStepsToGraph(
  steps: Step[],
  branchTargets: Record<string, BranchTargets>,
  options: {
    selectedStepId?: string;
    failedStepId?: string;
    errors?: ValidationIssue[];
  } = {}
) {
  const nodes: Node[] = steps.map((step, index) => {
    const hasError = options.errors?.some(
      (issue) => issue.severity === "error" && issue.stepId === step.id
    );
    const isSelected = step.id === options.selectedStepId;
    const isFailed = step.id === options.failedStepId;

    return {
      id: step.id,
      position: { x: step.type === "condition" ? 260 : 80, y: index * 130 },
      data: {
        label: `${index + 1}. ${nodeMeta[step.type].label}\n${summarizeStep(step)}`,
      },
      draggable: false,
      selectable: true,
      style: {
        width: 220,
        borderRadius: 8,
        border: `1px solid ${
          isFailed ? "#dc2626" : hasError ? "#f59e0b" : isSelected ? "#2563eb" : "#d1d5db"
        }`,
        boxShadow: isSelected ? "0 0 0 3px rgba(37,99,235,0.16)" : "none",
        color: "#111827",
        fontSize: 12,
        whiteSpace: "pre-line",
      },
    };
  });

  const edges: Edge[] = [];
  steps.forEach((step, index) => {
    if (step.type === "condition") {
      const targets = branchTargets[step.id] ?? {};
      if (targets.trueStepId) {
        edges.push({
          id: `${step.id}-true-${targets.trueStepId}`,
          source: step.id,
          target: targets.trueStepId,
          label: "true",
          animated: true,
          style: { stroke: "#059669" },
        });
      }
      if (targets.falseStepId) {
        edges.push({
          id: `${step.id}-false-${targets.falseStepId}`,
          source: step.id,
          target: targets.falseStepId,
          label: "false",
          animated: true,
          style: { stroke: "#dc2626" },
        });
      }
      return;
    }

    const nextStep = steps[index + 1];
    if (nextStep) {
      if (areSiblingBranchTargets(step.id, nextStep.id, branchTargets)) return;
      edges.push({
        id: `${step.id}-${nextStep.id}`,
        source: step.id,
        target: nextStep.id,
      });
    }
  });

  return { nodes, edges };
}

function areSiblingBranchTargets(
  currentStepId: string,
  nextStepId: string,
  branchTargets: Record<string, BranchTargets>
) {
  return Object.values(branchTargets).some((targets) => {
    const siblingIds = [targets.trueStepId, targets.falseStepId];
    return siblingIds.includes(currentStepId) && siblingIds.includes(nextStepId);
  });
}
