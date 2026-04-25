import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { WorkflowDefinition, Step } from "@/lib/types";

interface Edge {
    id: string;
    source: string;
    target: string;
}

interface WorkflowState {
    workflow: WorkflowDefinition;
    edges: Edge[];
    selectedStepId?: string;

    addStep: (type: string, position: { x: number; y: number }) => void;
    connectSteps: (source: string, target: string) => void;

    updateStep: (id: string, step: Partial<Step>) => void;
    selectStep: (id: string) => void;

    buildDSL: () => WorkflowDefinition;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
    workflow: { steps: [] },
    edges: [],

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

    connectSteps: (source, target) =>
        set((state) => ({
            edges: [
                ...state.edges,
                {
                    id: `${source}-${target}`,
                    source,
                    target,
                },
            ],
        })),

    updateStep: (id, updates) =>
        set((state) => ({
            workflow: {
                steps: state.workflow.steps.map((s) =>
                    s.id === id ? { ...s, ...updates } : s
                ),
            },
        })),

    selectStep: (id) => set({ selectedStepId: id }),

    buildDSL: () => {
        const { workflow, edges } = get();

        const nextMap: Record<string, string> = {};

        edges.forEach((e) => {
            nextMap[e.source] = e.target;
        });

        return {
            steps: workflow.steps.map((step) => ({
                ...step,
                next: nextMap[step.id] || "",
            })),
        };
    },
}));