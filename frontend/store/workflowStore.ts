import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { WorkflowDefinition, Step } from "@/lib/types";

interface Edge {
    id: string;
    source: string;
    target: string;
    type?: "true" | "false";
}

interface WorkflowState {
    workflow: WorkflowDefinition;
    edges: Edge[];

    selectedStepId?: string;

    addStep: (type: string, position: { x: number; y: number }) => void;
    connectSteps: (
        source: string,
        target: string,
        type?: "true" | "false"
    ) => void;

    selectStep: (id: string) => void;

    updateStep: (id: string, step: Partial<Step>) => void;

    buildDSL: () => WorkflowDefinition;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
    workflow: { steps: [] },
    edges: [],
    selectedStepId: undefined,

    addStep: (type, position) =>
        set((state) => {
            const newStep: Step = {
                id: uuid(),
                type: type as any,
                config: {},
            };

            return {
                workflow: {
                    steps: [...state.workflow.steps, newStep],
                },
            };
        }),

    connectSteps: (source, target, type) =>
        set((state) => ({
            edges: [
                ...state.edges,
                {
                    id: `${source}-${target}-${type || "default"}`,
                    source,
                    target,
                    type,
                },
            ],
        })),

    selectStep: (id) =>
        set({
            selectedStepId: id,
        }),

    updateStep: (id, updates) =>
        set((state) => ({
            workflow: {
                steps: state.workflow.steps.map((s) =>
                    s.id === id ? { ...s, ...updates } : s
                ),
            },
        })),

    buildDSL: () => {
        const { workflow, edges } = get();

        const map: Record<string, any> = {};

        edges.forEach((e) => {
            if (!map[e.source]) map[e.source] = {};

            if (e.type === "true") map[e.source].next_true = e.target;
            else if (e.type === "false") map[e.source].next_false = e.target;
            else map[e.source].next = e.target;
        });

        return {
            steps: workflow.steps.map((s) => ({
                ...s,
                ...map[s.id],
            })),
        };
    },
}));