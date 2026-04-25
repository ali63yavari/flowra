import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import { createStep } from "@/lib/stepDefaults";
import { validateWorkflow } from "@/lib/validation";
import type {
  BranchTargets,
  WorkflowExecutionState,
  Step,
  StepConfig,
  StepType,
  ValidationIssue,
  WorkflowDefinition,
  CollectionWorkflow,
  WorkflowTemplate,
  WorkspaceCollection,
} from "@/lib/types";

interface WorkflowState {
  collections: Record<string, WorkspaceCollection>;
  workflows: Record<string, CollectionWorkflow>;
  activeCollectionId?: string;
  activeWorkflowId?: string;

  workflow: WorkflowDefinition;
  branchTargets: Record<string, BranchTargets>;
  selectedStepId?: string;
  collapsedStepIds: string[];
  execution: WorkflowExecutionState;
  errors: ValidationIssue[];

  createCollection: (name?: string) => string;
  renameCollection: (id: string, name: string) => void;
  deleteCollection: (id: string) => void;
  selectCollection: (id: string) => void;
  createWorkflow: (collectionId?: string, name?: string) => string;
  renameWorkflow: (id: string, name: string) => void;
  updateWorkflowDescription: (id: string, description: string) => void;
  duplicateWorkflow: (id: string) => void;
  deleteWorkflow: (id: string) => void;
  selectWorkflow: (id: string) => void;

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
    status: WorkflowExecutionState["status"],
    detail?: { activeStepId?: string; failedStepId?: string }
  ) => void;
  setExecutionResult: (result: {
    result?: Record<string, unknown> | null;
    error?: string | null;
    lastWorkflow?: WorkflowDefinition | null;
  }) => void;
}

const defaultExecution: WorkflowExecutionState = {
  status: "idle",
  result: null,
  error: null,
  lastWorkflow: null,
};

const initialWorkspace = createInitialWorkspace();

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      ...initialWorkspace,

      createCollection: (name) => {
        const now = new Date().toISOString();
        const id = uuid();
        const collection: WorkspaceCollection = {
          id,
          name: name?.trim() || `Collection ${Object.keys(get().collections).length + 1}`,
          workflowIds: [],
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          collections: { ...state.collections, [id]: collection },
          activeCollectionId: id,
          activeWorkflowId: undefined,
          ...activeFieldsFromWorkflow(undefined),
        }));

        return id;
      },

      renameCollection: (id, name) =>
        set((state) => {
          const collection = state.collections[id];
          if (!collection || !name.trim()) return state;
          return {
            collections: {
              ...state.collections,
              [id]: { ...collection, name: name.trim(), updatedAt: new Date().toISOString() },
            },
          };
        }),

      deleteCollection: (id) =>
        set((state) => {
          const collection = state.collections[id];
          if (!collection) return state;
          const collections = { ...state.collections };
          const workflows = { ...state.workflows };
          delete collections[id];
          collection.workflowIds.forEach((workflowId) => delete workflows[workflowId]);

          const nextCollection = Object.values(collections)[0];
          const nextWorkflow = nextCollection?.workflowIds[0]
            ? workflows[nextCollection.workflowIds[0]]
            : undefined;

          if (!nextCollection) {
            return createInitialWorkspace();
          }

          return {
            collections,
            workflows,
            activeCollectionId: nextCollection.id,
            activeWorkflowId: nextWorkflow?.id,
            ...activeFieldsFromWorkflow(nextWorkflow),
          };
        }),

      selectCollection: (id) =>
        set((state) => {
          const collection = state.collections[id];
          if (!collection) return state;
          const workflow = collection.workflowIds[0] ? state.workflows[collection.workflowIds[0]] : undefined;
          return {
            activeCollectionId: id,
            activeWorkflowId: workflow?.id,
            ...activeFieldsFromWorkflow(workflow),
          };
        }),

      createWorkflow: (collectionId, name) => {
        const state = get();
        const targetCollectionId = collectionId ?? state.activeCollectionId ?? Object.keys(state.collections)[0];
        if (!targetCollectionId) return "";
        const workflow = makeWorkflow(targetCollectionId, name || "Untitled workflow");

        set((current) => {
          const collection = current.collections[targetCollectionId];
          if (!collection) return current;
          return {
            collections: {
              ...current.collections,
              [targetCollectionId]: {
                ...collection,
                workflowIds: [...collection.workflowIds, workflow.id],
                updatedAt: new Date().toISOString(),
              },
            },
            workflows: { ...current.workflows, [workflow.id]: workflow },
            activeCollectionId: targetCollectionId,
            activeWorkflowId: workflow.id,
            ...activeFieldsFromWorkflow(workflow),
          };
        });

        return workflow.id;
      },

      renameWorkflow: (id, name) =>
        set((state) => updateWorkflowOnly(state, id, { name: name.trim() || "Untitled workflow" })),

      updateWorkflowDescription: (id, description) =>
        set((state) => updateWorkflowOnly(state, id, { description })),

      duplicateWorkflow: (id) =>
        set((state) => {
          const source = state.workflows[id];
          const collection = source ? state.collections[source.collectionId] : undefined;
          if (!source || !collection) return state;

          const now = new Date().toISOString();
          const copy: CollectionWorkflow = {
            ...cloneWorkflow(source),
            id: uuid(),
            name: `${source.name} copy`,
            createdAt: now,
            updatedAt: now,
          };
          const index = collection.workflowIds.indexOf(id);
          const workflowIds = [...collection.workflowIds];
          workflowIds.splice(index + 1, 0, copy.id);

          return {
            collections: {
              ...state.collections,
              [collection.id]: { ...collection, workflowIds, updatedAt: now },
            },
            workflows: { ...state.workflows, [copy.id]: copy },
            activeCollectionId: collection.id,
            activeWorkflowId: copy.id,
            ...activeFieldsFromWorkflow(copy),
          };
        }),

      deleteWorkflow: (id) =>
        set((state) => {
          const workflow = state.workflows[id];
          const collection = workflow ? state.collections[workflow.collectionId] : undefined;
          if (!workflow || !collection) return state;

          const workflows = { ...state.workflows };
          delete workflows[id];
          const workflowIds = collection.workflowIds.filter((workflowId) => workflowId !== id);
          const nextWorkflowId =
            workflowIds[collection.workflowIds.indexOf(id)] ??
            workflowIds[collection.workflowIds.indexOf(id) - 1] ??
            workflowIds[0];
          const nextWorkflow = nextWorkflowId ? workflows[nextWorkflowId] : undefined;

          return {
            collections: {
              ...state.collections,
              [collection.id]: { ...collection, workflowIds, updatedAt: new Date().toISOString() },
            },
            workflows,
            activeCollectionId: collection.id,
            activeWorkflowId: state.activeWorkflowId === id ? nextWorkflow?.id : state.activeWorkflowId,
            ...(state.activeWorkflowId === id ? activeFieldsFromWorkflow(nextWorkflow) : {}),
          };
        }),

      selectWorkflow: (id) =>
        set((state) => {
          const workflow = state.workflows[id];
          if (!workflow) return state;
          return {
            activeCollectionId: workflow.collectionId,
            activeWorkflowId: id,
            ...activeFieldsFromWorkflow(workflow),
          };
        }),

      addStep: (type) => get().insertStepAt(get().workflow.steps.length, type),

      insertStepAt: (index, type) => {
        const step = createStep(uuid(), type);
        set((state) => {
          const steps = [...state.workflow.steps];
          steps.splice(index, 0, step);
          return syncActiveWorkflow(state, {
            workflow: { steps },
            selectedStepId: step.id,
            errors: [],
          });
        });
        return step.id;
      },

      updateStepConfig: (id, type, config) =>
        set((state) =>
          syncActiveWorkflow(state, {
            workflow: {
              steps: state.workflow.steps.map((step) =>
                step.id === id && step.type === type ? ({ ...step, config } as Step) : step
              ),
            },
            errors: [],
          })
        ),

      updateStep: (id, updates) =>
        set((state) =>
          syncActiveWorkflow(state, {
            workflow: {
              steps: state.workflow.steps.map((step) =>
                step.id === id ? ({ ...step, ...updates } as Step) : step
              ),
            },
            errors: [],
          })
        ),

      moveStep: (fromIndex, toIndex) =>
        set((state) => {
          if (fromIndex === toIndex) return state;
          const steps = [...state.workflow.steps];
          const [moved] = steps.splice(fromIndex, 1);
          if (!moved) return state;
          steps.splice(toIndex, 0, moved);
          return syncActiveWorkflow(state, { workflow: { steps }, errors: [] });
        }),

      duplicateStep: (id) =>
        set((state) => {
          const index = state.workflow.steps.findIndex((step) => step.id === id);
          if (index < 0) return state;
          const source = state.workflow.steps[index];
          const copy = cloneStep(source, uuid());
          const steps = [...state.workflow.steps];
          steps.splice(index + 1, 0, copy);
          return syncActiveWorkflow(state, {
            workflow: { steps },
            selectedStepId: copy.id,
            errors: [],
          });
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
          return syncActiveWorkflow(state, {
            workflow: { steps },
            branchTargets,
            selectedStepId: state.selectedStepId === id ? steps[0]?.id : state.selectedStepId,
            collapsedStepIds: state.collapsedStepIds.filter((stepId) => stepId !== id),
            errors: [],
          });
        }),

      selectStep: (id) => set((state) => syncActiveWorkflow(state, { selectedStepId: id })),

      toggleCollapsed: (id) =>
        set((state) =>
          syncActiveWorkflow(state, {
            collapsedStepIds: state.collapsedStepIds.includes(id)
              ? state.collapsedStepIds.filter((stepId) => stepId !== id)
              : [...state.collapsedStepIds, id],
          })
        ),

      setBranchTarget: (id, branch, targetId) =>
        set((state) =>
          syncActiveWorkflow(state, {
            branchTargets: {
              ...state.branchTargets,
              [id]: {
                ...state.branchTargets[id],
                [branch]: targetId || undefined,
              },
            },
            errors: [],
          })
        ),

      loadTemplate: (template) => {
        const state = get();
        const collectionId = state.activeCollectionId ?? Object.keys(state.collections)[0];
        if (!collectionId) return;
        const workflow = makeWorkflow(collectionId, template.name, {
          description: template.description,
          workflow: { steps: template.steps.map((step) => cloneStep(step, step.id)) },
          branchTargets: template.branchTargets ?? {},
          selectedStepId: template.steps[0]?.id,
        });

        set((current) => {
          const collection = current.collections[collectionId];
          if (!collection) return current;
          return {
            collections: {
              ...current.collections,
              [collectionId]: {
                ...collection,
                workflowIds: [...collection.workflowIds, workflow.id],
                updatedAt: new Date().toISOString(),
              },
            },
            workflows: { ...current.workflows, [workflow.id]: workflow },
            activeCollectionId: collectionId,
            activeWorkflowId: workflow.id,
            ...activeFieldsFromWorkflow(workflow),
          };
        });
      },

      validate: () => {
        const issues = validateWorkflow(get().workflow.steps, get().branchTargets);
        set((state) => syncActiveWorkflow(state, { errors: issues }));
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
        set((state) =>
          syncActiveWorkflow(state, {
            execution: {
              ...state.execution,
              status,
              activeStepId: detail?.activeStepId,
              failedStepId: detail?.failedStepId,
            },
          })
        ),

      setExecutionResult: (result) =>
        set((state) =>
          syncActiveWorkflow(state, {
            execution: {
              ...state.execution,
              ...result,
            },
          })
        ),
    }),
    {
      name: "flowra-workspace-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        collections: state.collections,
        workflows: state.workflows,
        activeCollectionId: state.activeCollectionId,
        activeWorkflowId: state.activeWorkflowId,
        workflow: state.workflow,
        branchTargets: state.branchTargets,
        selectedStepId: state.selectedStepId,
        collapsedStepIds: state.collapsedStepIds,
        execution: state.execution,
        errors: state.errors,
      }),
    }
  )
);

function createInitialWorkspace() {
  const collection = makeCollection("Default collection");
  const workflow = makeWorkflow(collection.id, "Untitled workflow");
  collection.workflowIds = [workflow.id];

  return {
    collections: { [collection.id]: collection },
    workflows: { [workflow.id]: workflow },
    activeCollectionId: collection.id,
    activeWorkflowId: workflow.id,
    ...activeFieldsFromWorkflow(workflow),
  };
}

function makeCollection(name: string): WorkspaceCollection {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    name,
    workflowIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

function makeWorkflow(
  collectionId: string,
  name: string,
  overrides: Partial<CollectionWorkflow> = {}
): CollectionWorkflow {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    collectionId,
    name,
    description: "",
    workflow: { steps: [] },
    branchTargets: {},
    selectedStepId: undefined,
    collapsedStepIds: [],
    errors: [],
    execution: { ...defaultExecution },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function activeFieldsFromWorkflow(workflow?: CollectionWorkflow) {
  return {
    workflow: workflow?.workflow ?? { steps: [] },
    branchTargets: workflow?.branchTargets ?? {},
    selectedStepId: workflow?.selectedStepId,
    collapsedStepIds: workflow?.collapsedStepIds ?? [],
    execution: workflow?.execution ?? { ...defaultExecution },
    errors: workflow?.errors ?? [],
  };
}

function syncActiveWorkflow(
  state: WorkflowState,
  patch: Partial<
    Pick<
      WorkflowState,
      "workflow" | "branchTargets" | "selectedStepId" | "collapsedStepIds" | "execution" | "errors"
    >
  >
) {
  const activeWorkflowId = state.activeWorkflowId;
  const activeWorkflow = activeWorkflowId ? state.workflows[activeWorkflowId] : undefined;
  const activeFields = {
    workflow: patch.workflow ?? state.workflow,
    branchTargets: patch.branchTargets ?? state.branchTargets,
    selectedStepId: Object.prototype.hasOwnProperty.call(patch, "selectedStepId")
      ? patch.selectedStepId
      : state.selectedStepId,
    collapsedStepIds: patch.collapsedStepIds ?? state.collapsedStepIds,
    execution: patch.execution ?? state.execution,
    errors: patch.errors ?? state.errors,
  };

  if (!activeWorkflowId || !activeWorkflow) {
    return activeFields;
  }

  return {
    ...activeFields,
    workflows: {
      ...state.workflows,
      [activeWorkflowId]: {
        ...activeWorkflow,
        ...activeFields,
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

function updateWorkflowOnly(
  state: WorkflowState,
  id: string,
  patch: Partial<Pick<CollectionWorkflow, "name" | "description">>
) {
  const workflow = state.workflows[id];
  if (!workflow) return state;
  const updated = { ...workflow, ...patch, updatedAt: new Date().toISOString() };
  return {
    workflows: { ...state.workflows, [id]: updated },
    ...(state.activeWorkflowId === id ? activeFieldsFromWorkflow(updated) : {}),
  };
}

function cloneWorkflow(workflow: CollectionWorkflow): CollectionWorkflow {
  return JSON.parse(JSON.stringify(workflow)) as CollectionWorkflow;
}

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
