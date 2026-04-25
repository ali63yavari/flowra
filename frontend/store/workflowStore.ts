import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { WorkflowDefinition, Step } from "@/lib/types";

interface WorkflowState {
    workflow: WorkflowDefinition;
    selectedStepId?: string;

    addStep: (type: string, position: { x: number; y: number }) => void;
    updateStep: (id: string, step: Partial<Step>) => void;
    selectStep: (id: string) => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
    workflow: { steps: [] },

    addStep: (type, position) =>
        set((state) => {
            const newStep: Step = {
                id: uuid(),
                type: type as any,
                config: {},
                next: "",
            };

            return {
                workflow: {
                    steps: [...state.workflow.steps, newStep],
                },
            };
        }),

    updateStep: (id, updates) =>
        set((state) => ({
            workflow: {
                steps: state.workflow.steps.map((s) =>
                    s.id === id ? { ...s, ...updates } : s
                ),
            },
        })),

    selectStep: (id) => set({ selectedStepId: id }),
}));