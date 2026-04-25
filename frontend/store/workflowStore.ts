import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { WorkflowDefinition, Step } from "@/lib/types";

interface Edge {
    id: string;
    source: string;
    target: string;
    type?: "true" | "false";
}

interface PositionedStep extends Step {
    position: { x: number; y: number };
}

interface WorkflowState {
    workflow: { steps: PositionedStep[] };
    edges: Edge[];

    selectedStepId?: string;

    addStep: (type: string, position: { x: number; y: number }) => string;
    updatePosition: (id: string, position: { x: number; y: number }) => void;

    connectSteps: (
        source: string,
        target: string,
        type?: "true" | "false"
    ) => void;

    deleteStep: (id: string) => void;
    deleteEdge: (id: string) => void;

    selectStep: (id: string) => void;

    buildDSL: () => WorkflowDefinition;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
    workflow: { steps: [] },
    edges: [],

    addStep: (type, position) => {
        const id = uuid();
        set((state) => ({
            workflow: {
                steps: [
                    ...state.workflow.steps,
                    {
                        id: id,
                        type: type as any,
                        config: {},
                        position,
                    },
                ],
            },
        }));

        return id;
    },

    updatePosition: (id, position) =>
        set((state) => ({
            workflow: {
                steps: state.workflow.steps.map((s) =>
                    s.id === id ? { ...s, position } : s
                ),
            },
        })),

    connectSteps: (source, target, type) =>
        set((state) => ({
            edges: [
                ...state.edges,
                {
                    id: uuid(),
                    source,
                    target,
                    type,
                },
            ],
        })),

    deleteStep: (id) =>
        set((state) => ({
            workflow: {
                steps: state.workflow.steps.filter((s) => s.id !== id),
            },
            edges: state.edges.filter(
                (e) => e.source !== id && e.target !== id
            ),
        })),

    deleteEdge: (id) =>
        set((state) => ({
            edges: state.edges.filter((e) => e.id !== id),
        })),

    selectStep: (id) => set({ selectedStepId: id }),

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
                id: s.id,
                type: s.type,
                config: s.config,
                ...map[s.id],
            })),
        };
    },
}));