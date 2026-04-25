import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { createStep } from "@/lib/stepDefaults";
import { validateWorkflow } from "@/lib/validation";
import type {
  BranchTargets,
  Step,
  StepConfig,
  StepType,
  ValidationIssue,
  WorkflowDefinition,
  WorkflowTemplate,
} from "@/lib/types";

interface WorkflowState {
  workflow: { steps: Step[] };
  branchTargets: Record<string, BranchTargets>;
  selectedStepId?: string;
  collapsedStepIds: string[];
  execution: {
    status: "idle" | "validating" | "running" | "success" | "failed";
    activeStepId?: string;
    failedStepId?: string;
  };
  errors: ValidationIssue[];

  addStep: (type: StepType) => string;
  insertStepAt: (index: number, type: StepType) => string;
  updateStepConfig: <T extends StepType>(
    id: string,
    type: T,
    config: Extract<Step, { type: T }>["config"]
  ) => void;
  updateStep: (id: string, updates: Partial<Step>) => void;
  moveStep: (from: number, to: number) => void;
  duplicateStep: (id: string) => void;
  deleteStep: (id: string) => void;
  selectStep: (id?: string) => void;
  toggleCollapsed: (id: string) => void;
  setBranchTarget: (id: string, branch: keyof BranchTargets, targetId: string) => void;
  loadTemplate: (template: WorkflowTemplate) => void;
  validate: () => ValidationIssue[];
  buildDSL: () => WorkflowDefinition;
  setExecutionStatus: (
    status: WorkflowState["execution"]["status"],
    detail?: { activeStepId?: string; failedStepId?: string }
  ) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflow: { steps: [] },
  branchTargets: {},
  collapsedStepIds: [],
  execution: { status: "idle" },
  errors: [],

  addStep: (type) => get().insertStepAt(get().workflow.steps.length, type),

  insertStepAt: (index, type) => {
    const step = createStep(uuid(), type);
    set((state) => {
      const steps = [...state.workflow.steps];
      steps.splice(index, 0, step);
      return {
        workflow: { steps },
        selectedStepId: step.id,
        errors: [],
      };
    });
    return step.id;
  },

  updateStepConfig: (id, type, config) =>
    set((state) => ({
      workflow: {
        steps: state.workflow.steps.map((step) =>
          step.id === id && step.type === type ? ({ ...step, config } as Step) : step
        ),
      },
      errors: [],
    })),

  updateStep: (id, updates) =>
    set((state) => ({
      workflow: {
        steps: state.workflow.steps.map((step) =>
          step.id === id ? ({ ...step, ...updates } as Step) : step
        ),
      },
      errors: [],
    })),

  moveStep: (fromIndex, toIndex) =>
    set((state) => {
      if (fromIndex === toIndex) return state;
      const steps = [...state.workflow.steps];
      const [moved] = steps.splice(fromIndex, 1);
      if (!moved) return state;
      steps.splice(toIndex, 0, moved);
      return { workflow: { steps }, errors: [] };
    }),

  duplicateStep: (id) =>
    set((state) => {
      const index = state.workflow.steps.findIndex((step) => step.id === id);
      if (index < 0) return state;
      const source = state.workflow.steps[index];
      const copy = cloneStep(source, uuid());
      const steps = [...state.workflow.steps];
      steps.splice(index + 1, 0, copy);
      return {
        workflow: { steps },
        selectedStepId: copy.id,
        errors: [],
      };
    }),

  deleteStep: (id) =>
    set((state) => {
      const steps = state.workflow.steps.filter((step) => step.id !== id);
      const branchTargets = Object.fromEntries(
        Object.entries(state.branchTargets)
          .filter(([stepId]) => stepId !== id)
          .map(([stepId, targets]) => [
            stepId,
            {
              trueStepId: targets.trueStepId === id ? undefined : targets.trueStepId,
              falseStepId: targets.falseStepId === id ? undefined : targets.falseStepId,
            },
          ])
      );
      return {
        workflow: { steps },
        branchTargets,
        selectedStepId: state.selectedStepId === id ? steps[0]?.id : state.selectedStepId,
        collapsedStepIds: state.collapsedStepIds.filter((stepId) => stepId !== id),
        errors: [],
      };
    }),

  selectStep: (id) => set({ selectedStepId: id }),

  toggleCollapsed: (id) =>
    set((state) => ({
      collapsedStepIds: state.collapsedStepIds.includes(id)
        ? state.collapsedStepIds.filter((stepId) => stepId !== id)
        : [...state.collapsedStepIds, id],
    })),

  setBranchTarget: (id, branch, targetId) =>
    set((state) => ({
      branchTargets: {
        ...state.branchTargets,
        [id]: {
          ...state.branchTargets[id],
          [branch]: targetId || undefined,
        },
      },
      errors: [],
    })),

  loadTemplate: (template) =>
    set({
      workflow: { steps: template.steps.map((step) => cloneStep(step, step.id)) },
      branchTargets: template.branchTargets ?? {},
      selectedStepId: template.steps[0]?.id,
      collapsedStepIds: [],
      execution: { status: "idle" },
      errors: [],
    }),

  validate: () => {
    const issues = validateWorkflow(get().workflow.steps, get().branchTargets);
    set({ errors: issues });
    return issues;
  },

  buildDSL: () => {
    const { workflow, branchTargets } = get();
    const steps = workflow.steps.map((step, index) => {
      const nextStepId = workflow.steps[index + 1]?.id;
      const base = cloneStep(step, step.id);

      if (base.type === "condition") {
        const targets = branchTargets[base.id] ?? {};
        return {
          ...base,
          next: undefined,
          next_true: targets.trueStepId,
          next_false: targets.falseStepId,
        };
      }

      const shouldStopBeforeNext =
        nextStepId && areSiblingBranchTargets(base.id, nextStepId, branchTargets);

      return {
        ...base,
        next: shouldStopBeforeNext ? undefined : nextStepId,
        next_true: undefined,
        next_false: undefined,
      };
    });

    return { steps };
  },

  setExecutionStatus: (status, detail) =>
    set({
      execution: {
        status,
        activeStepId: detail?.activeStepId,
        failedStepId: detail?.failedStepId,
      },
    }),
}));

function cloneStep(step: Step, id: string): Step {
  return {
    ...step,
    id,
    config: cloneConfig(step.config),
  } as Step;
}

function cloneConfig<T extends StepConfig>(config: T): T {
  return JSON.parse(JSON.stringify(config)) as T;
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
