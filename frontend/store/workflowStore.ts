import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { WorkflowDefinition, Step } from "@/lib/types";
import { validateGraph, ValidationError } from "@/lib/validation";

interface Edge {
    id: string;
    source: string;
    target: string;
}

interface WorkflowState {
    workflow: WorkflowDefinition;
    edges: Edge[];
    selectedStepId?: string;
    errors: ValidationError[];

    addStep: (type: string, position: { x: number; y: number }) => void;
    connectSteps: (source: string, target: string) => boolean;

    updateStep: (id: string, step: Partial<Step>) => void;
    selectStep: (id: string) => void;

    buildDSL: () => WorkflowDefinition;
    validate: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
    workflow: { steps: [] },
    edges: [],
    errors: [],

    addStep: (type) =>
        set((state) => {
            const newStep: Step = {
                id: uuid(),
                type: type as any,
                config: {},
                next: "",
            };

            return {
                workflow: { steps: [...state.workflow.steps, newStep] },
            };
        }),

    connectSteps: (source, target) => {
        const { edges, workflow } = get();

        // Constraint: only one outgoing edge
        const already = edges.find((e) => e.source === source);
        if (already) return false;

        const newEdges = [
            ...edges,
            { id: `${source}-${target}`, source, target },
        ];

        const errors = validateGraph(workflow.steps, newEdges);

        set({ edges: newEdges, errors });
        return true;
    },

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
        edges.forEach((e) => (nextMap[e.source] = e.target));

        return {
            steps: workflow.steps.map((s) => ({
                ...s,
                next: nextMap[s.id] || "",
            })),
        };
    },

    validate: () => {
        const { workflow, edges } = get();
        const errors = validateGraph(workflow.steps, edges);
        set({ errors });
    },
}));