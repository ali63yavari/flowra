import { create } from "zustand";
import { WorkflowDefinition, Step } from "@/lib/types";

interface WorkflowState {
  workflow: WorkflowDefinition;
  selectedStepId?: string;

  addStep: (step: Step) => void;
  updateStep: (id: string, step: Partial<Step>) => void;
  selectStep: (id: string) => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  workflow: { steps: [] },

  addStep: (step) =>
    set((state) => ({
      workflow: {
        steps: [...state.workflow.steps, step],
      },
    })),

  updateStep: (id, updates) =>
    set((state) => ({
      workflow: {
        steps: state.workflow.steps.map((s) =>
          s.id === id ? { ...s, ...updates } : s,
        ),
      },
    })),

  selectStep: (id) => set({ selectedStepId: id }),
}));
