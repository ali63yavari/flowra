import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import {
  createBackendEnvironment,
  deleteBackendEnvironment,
  renameBackendEnvironment,
  replaceBackendVariables,
  updateBackendWorkflow,
  type BackendCollection,
  type BackendWorkflow,
} from "@/lib/api";
import { createStep } from "@/lib/stepDefaults";
import { validateWorkflow } from "@/lib/validation";
import type {
  BranchTargets,
  ExecutionConsoleEntry,
  WorkflowExecutionState,
  Step,
  StepConfig,
  StepType,
  ValidationIssue,
  WorkflowDefinition,
  CollectionWorkflow,
  EnvironmentVariableSet,
  WorkflowTemplate,
  WorkspaceCollection,
} from "@/lib/types";

interface WorkflowState {
  collections: Record<string, WorkspaceCollection>;
  workflows: Record<string, CollectionWorkflow>;
  activeCollectionId?: string;
  activeWorkflowId?: string;
  variables: EnvironmentVariableSet;

  workflow: WorkflowDefinition;
  branchTargets: Record<string, BranchTargets>;
  selectedStepId?: string;
  collapsedStepIds: string[];
  execution: WorkflowExecutionState;
  errors: ValidationIssue[];

  createCollection: (
    name?: string,
    options?: { description?: string; isOnline?: boolean; accessRole?: string }
  ) => string;
  renameCollection: (id: string, name: string) => void;
  updateCollectionMeta: (
    id: string,
    patch: Partial<Pick<WorkspaceCollection, "name" | "description" | "isOnline" | "accessRole">>
  ) => void;
  deleteCollection: (id: string) => void;
  selectCollection: (id: string) => void;
  createWorkflow: (collectionId?: string, name?: string) => string;
  renameWorkflow: (id: string, name: string) => void;
  updateWorkflowDescription: (id: string, description: string) => void;
  updateWorkflowAccess: (id: string, access: { isOnline?: boolean; accessRole?: string }) => void;
  duplicateWorkflow: (id: string) => string;
  deleteWorkflow: (id: string) => void;
  selectWorkflow: (id: string) => void;
  createEnvironment: (name: string) => void;
  renameEnvironment: (oldName: string, newName: string) => void;
  deleteEnvironment: (name: string) => void;
  setActiveEnvironment: (name: string) => void;
  updateTenantVariables: (environment: string, variables: Record<string, string>) => void;
  updateCollectionVariables: (
    collectionId: string,
    environment: string,
    variables: Record<string, string>
  ) => void;

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
  collapseAllSteps: () => void;
  expandAllSteps: () => void;
  setBranchTarget: (id: string, branch: keyof BranchTargets, targetId: string) => void;
  loadTemplate: (template: WorkflowTemplate, collectionId?: string) => void;
  validate: () => ValidationIssue[];
  buildDSL: () => WorkflowDefinition;
  buildDSLUntilStep: (stepId: string) => WorkflowDefinition;
  setExecutionStatus: (
    status: WorkflowExecutionState["status"],
    detail?: { activeStepId?: string; failedStepId?: string }
  ) => void;
  setExecutionResult: (result: {
    result?: Record<string, unknown> | null;
    input?: Record<string, unknown> | null;
    variables?: Record<string, unknown> | null;
    extracted?: Record<string, unknown> | null;
    lastResponse?: WorkflowExecutionState["lastResponse"];
    error?: string | null;
    lastWorkflow?: WorkflowDefinition | null;
    traces?: WorkflowExecutionState["traces"];
  }) => void;
  addConsoleEntry: (entry: Omit<ExecutionConsoleEntry, "id" | "createdAt">) => void;
  clearConsoleEntries: () => void;
  hydrateWorkspace: (collections: BackendCollection[]) => void;
  hydrateVariables: (variables: EnvironmentVariableSet) => void;
}

const defaultExecution: WorkflowExecutionState = {
  status: "idle",
  result: null,
  input: null,
  variables: null,
  extracted: null,
  lastResponse: null,
  error: null,
  lastWorkflow: null,
  consoleEntries: [],
  traces: [],
};

const defaultVariables: EnvironmentVariableSet = {
  environments: ["dev", "prod"],
  activeEnvironment: "dev",
  tenant: {
    dev: {
      baseUrl: "https://dev.example.com",
      apiKey: "dev-secret",
    },
    prod: {
      baseUrl: "https://api.example.com",
      apiKey: "prod-secret",
    },
  },
  collections: {},
};

const initialWorkspace = createInitialWorkspace();

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      ...initialWorkspace,

      hydrateWorkspace: (backendCollections) =>
        set((state) => {
          if (backendCollections.length === 0) return state;
          const collections: Record<string, WorkspaceCollection> = {};
          const workflows: Record<string, CollectionWorkflow> = {};

          backendCollections.forEach((collection) => {
            const workflowIds = collection.workflows.map((workflow) => workflow.id);
            collections[collection.id] = {
              id: collection.id,
              name: collection.name,
              description: collection.description ?? "",
              isOnline: collection.is_online ?? collection.IsOnline ?? false,
              accessRole: collection.access_role ?? collection.AccessRole ?? "Collection",
              workflowIds,
              createdAt: collection.created_at,
              updatedAt: collection.updated_at,
            };
            collection.workflows.forEach((workflow) => {
              workflows[workflow.id] = backendWorkflowToStoreWorkflow(workflow, collection.id);
            });
          });

          const activeCollectionId = state.activeCollectionId && collections[state.activeCollectionId]
            ? state.activeCollectionId
            : backendCollections[0]?.id;
          const activeCollection = activeCollectionId ? collections[activeCollectionId] : undefined;
          const activeWorkflowId = state.activeWorkflowId && workflows[state.activeWorkflowId]
            ? state.activeWorkflowId
            : activeCollection?.workflowIds[0];
          const activeWorkflow = activeWorkflowId ? workflows[activeWorkflowId] : undefined;

          return {
            collections,
            workflows,
            activeCollectionId,
            activeWorkflowId,
            ...activeFieldsFromWorkflow(activeWorkflow),
          };
        }),

      hydrateVariables: (variables) =>
        set((state) => ({
          variables: {
            ...variables,
            environments: variables.environments.length ? variables.environments : state.variables.environments,
            activeEnvironment: variables.activeEnvironment || state.variables.activeEnvironment,
          },
        })),

      createCollection: (name, options) => {
        const now = new Date().toISOString();
        const id = uuid();
        const collection: WorkspaceCollection = {
          id,
          name: name?.trim() || `Collection ${Object.keys(get().collections).length + 1}`,
          description: options?.description ?? "",
          isOnline: options?.isOnline ?? false,
          accessRole: options?.accessRole ?? "Collection",
          workflowIds: [],
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          collections: { ...state.collections, [id]: collection },
          variables: addCollectionVariableScope(state.variables, id),
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

      updateCollectionMeta: (id, patch) =>
        set((state) => {
          const collection = state.collections[id];
          if (!collection) return state;
          const nextName = patch.name?.trim();
          const updated: WorkspaceCollection = {
            ...collection,
            ...patch,
            name: nextName || collection.name,
            description: patch.description ?? collection.description,
            isOnline: patch.isOnline ?? collection.isOnline,
            accessRole: patch.accessRole ?? collection.accessRole,
            updatedAt: new Date().toISOString(),
          };
          return {
            collections: {
              ...state.collections,
              [id]: updated,
            },
          };
        }),

      deleteCollection: (id) =>
        set((state) => {
          const collection = state.collections[id];
          if (!collection) return state;
          const collections = { ...state.collections };
          const workflows = { ...state.workflows };
          const variables = removeCollectionVariableScope(state.variables, id);
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
            variables,
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

      renameWorkflow: (id, name) => {
        if (!name.trim()) return;
        set((state) => updateWorkflowOnly(state, id, { name }));
        syncWorkflowMetaToBackend(get(), id);
      },

      updateWorkflowDescription: (id, description) => {
        set((state) => updateWorkflowOnly(state, id, { description }));
        syncWorkflowMetaToBackend(get(), id);
      },

      updateWorkflowAccess: (id, access) => {
        set((state) => updateWorkflowOnly(state, id, access));
      },

      duplicateWorkflow: (id) =>
        {
          let copyId = "";
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
          copyId = copy.id;
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
        });
          return copyId;
        },

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

      createEnvironment: (name) =>
        set((state) => {
          const environmentName = sanitizeEnvironmentName(name);
          if (!environmentName || state.variables.environments.includes(environmentName)) return state;
          void createBackendEnvironment(environmentName).catch(() => undefined);
          return {
            variables: {
              environments: [...state.variables.environments, environmentName],
              activeEnvironment: environmentName,
              tenant: { ...state.variables.tenant, [environmentName]: {} },
              collections: Object.fromEntries(
                Object.entries(state.variables.collections).map(([collectionId, environments]) => [
                  collectionId,
                  { ...environments, [environmentName]: {} },
                ])
              ),
            },
          };
        }),

      renameEnvironment: (oldName, newName) =>
        set((state) => {
          const environmentName = sanitizeEnvironmentName(newName);
          if (
            !environmentName ||
            oldName === environmentName ||
            !state.variables.environments.includes(oldName) ||
            state.variables.environments.includes(environmentName)
          ) {
            return state;
          }
          void renameBackendEnvironment(oldName, environmentName).catch(() => undefined);

          return {
            variables: {
              environments: state.variables.environments.map((environment) =>
                environment === oldName ? environmentName : environment
              ),
              activeEnvironment:
                state.variables.activeEnvironment === oldName ? environmentName : state.variables.activeEnvironment,
              tenant: renameEnvironmentRecord(state.variables.tenant, oldName, environmentName),
              collections: Object.fromEntries(
                Object.entries(state.variables.collections).map(([collectionId, environments]) => [
                  collectionId,
                  renameEnvironmentRecord(environments, oldName, environmentName),
                ])
              ),
            },
          };
        }),

      deleteEnvironment: (name) =>
        set((state) => {
          if (!state.variables.environments.includes(name) || state.variables.environments.length <= 1) return state;
          void deleteBackendEnvironment(name).catch(() => undefined);
          const environments = state.variables.environments.filter((environment) => environment !== name);
          const nextActiveEnvironment = environments.includes(state.variables.activeEnvironment)
            ? state.variables.activeEnvironment
            : environments[0];

          return {
            variables: {
              environments,
              activeEnvironment: nextActiveEnvironment ?? "dev",
              tenant: omitEnvironmentRecord(state.variables.tenant, name),
              collections: Object.fromEntries(
                Object.entries(state.variables.collections).map(([collectionId, collectionEnvironments]) => [
                  collectionId,
                  omitEnvironmentRecord(collectionEnvironments, name),
                ])
              ),
            },
          };
        }),

      setActiveEnvironment: (name) =>
        set((state) => {
          if (!state.variables.environments.includes(name)) return state;
          return {
            variables: { ...state.variables, activeEnvironment: name },
          };
        }),

      updateTenantVariables: (environment, variables) =>
        {
          set((state) => ({
            variables: {
              ...state.variables,
              tenant: {
                ...state.variables.tenant,
                [environment]: variables,
              },
            },
          }));
          void replaceBackendVariables({ scope: "tenant", environment, variables }).catch(() => undefined);
        },

      updateCollectionVariables: (collectionId, environment, variables) =>
        {
          set((state) => ({
            variables: {
              ...state.variables,
              collections: {
                ...state.variables.collections,
                [collectionId]: {
                  ...(state.variables.collections[collectionId] ?? {}),
                  [environment]: variables,
                },
              },
            },
          }));
          void replaceBackendVariables({
            scope: "collection",
            collectionId,
            environment,
            variables,
          }).catch(() => undefined);
        },

      addStep: (type) => get().insertStepAt(get().workflow.steps.length, type),

      insertStepAt: (index, type) => {
        const step = createStep(uuid(), type);
        set((state) => {
          const steps = [...state.workflow.steps];
          steps.splice(index, 0, step);
          const workflow = { steps };
          return syncActiveWorkflow(state, {
            workflow,
            selectedStepId: step.id,
            errors: validateWorkflow(workflow.steps, state.branchTargets),
          });
        });
        syncCurrentWorkflowToBackend(get());
        return step.id;
      },

      updateStepConfig: (id, type, config) => {
        set((state) => {
          const workflow = {
            steps: state.workflow.steps.map((step) =>
              step.id === id && step.type === type ? ({ ...step, config } as Step) : step
            ),
          };
          return syncActiveWorkflow(state, {
            workflow,
            errors: validateWorkflow(workflow.steps, state.branchTargets),
          });
        });
        syncCurrentWorkflowToBackend(get());
      },

      updateStep: (id, updates) => {
        set((state) => {
          const workflow = {
            steps: state.workflow.steps.map((step) =>
              step.id === id ? ({ ...step, ...updates } as Step) : step
            ),
          };
          return syncActiveWorkflow(state, {
            workflow,
            errors: validateWorkflow(workflow.steps, state.branchTargets),
          });
        });
        syncCurrentWorkflowToBackend(get());
      },

      moveStep: (fromIndex, toIndex) => {
        set((state) => {
          if (fromIndex === toIndex) return state;
          const steps = [...state.workflow.steps];
          const [moved] = steps.splice(fromIndex, 1);
          if (!moved) return state;
          steps.splice(toIndex, 0, moved);
          const workflow = { steps };
          return syncActiveWorkflow(state, {
            workflow,
            errors: validateWorkflow(workflow.steps, state.branchTargets),
          });
        });
        syncCurrentWorkflowToBackend(get());
      },

      duplicateStep: (id) => {
        set((state) => {
          const index = state.workflow.steps.findIndex((step) => step.id === id);
          if (index < 0) return state;
          const source = state.workflow.steps[index];
          const copy = cloneStep(source, uuid());
          const steps = [...state.workflow.steps];
          steps.splice(index + 1, 0, copy);
          const workflow = { steps };
          return syncActiveWorkflow(state, {
            workflow,
            selectedStepId: copy.id,
            errors: validateWorkflow(workflow.steps, state.branchTargets),
          });
        });
        syncCurrentWorkflowToBackend(get());
      },

      deleteStep: (id) => {
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
          const workflow = { steps };
          return syncActiveWorkflow(state, {
            workflow: {
              steps,
            },
            branchTargets,
            selectedStepId: state.selectedStepId === id ? steps[0]?.id : state.selectedStepId,
            collapsedStepIds: state.collapsedStepIds.filter((stepId) => stepId !== id),
            errors: validateWorkflow(workflow.steps, branchTargets),
          });
        });
        syncCurrentWorkflowToBackend(get());
      },

      selectStep: (id) => set((state) => syncActiveWorkflow(state, { selectedStepId: id })),

      toggleCollapsed: (id) =>
        set((state) =>
          syncActiveWorkflow(state, {
            collapsedStepIds: state.collapsedStepIds.includes(id)
              ? state.collapsedStepIds.filter((stepId) => stepId !== id)
              : [...state.collapsedStepIds, id],
          })
        ),

      collapseAllSteps: () =>
        set((state) =>
          syncActiveWorkflow(state, {
            collapsedStepIds: state.workflow.steps.map((step) => step.id),
          })
        ),

      expandAllSteps: () =>
        set((state) =>
          syncActiveWorkflow(state, {
            collapsedStepIds: [],
          })
        ),

      setBranchTarget: (id, branch, targetId) => {
        set((state) => {
          const branchTargets = {
            ...state.branchTargets,
            [id]: {
              ...state.branchTargets[id],
              [branch]: targetId || undefined,
            },
          };
          return syncActiveWorkflow(state, {
            branchTargets,
            errors: validateWorkflow(state.workflow.steps, branchTargets),
          });
        });
        syncCurrentWorkflowToBackend(get());
      },

      loadTemplate: (template, targetCollectionId) => {
        const state = get();
        const collectionId = targetCollectionId ?? state.activeCollectionId ?? Object.keys(state.collections)[0];
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
        return buildDSLFromSteps(workflow.steps, branchTargets);
      },

      buildDSLUntilStep: (stepId) => {
        const { workflow, branchTargets } = get();
        const stepIndex = workflow.steps.findIndex((step) => step.id === stepId);
        if (stepIndex < 0) return { steps: [] };
        return buildDSLFromSteps(workflow.steps.slice(0, stepIndex + 1), branchTargets);
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

      addConsoleEntry: (entry) =>
        set((state) =>
          syncActiveWorkflow(state, {
            execution: {
              ...state.execution,
              consoleEntries: [
                {
                  ...entry,
                  id: uuid(),
                  createdAt: new Date().toISOString(),
                },
                ...(state.execution.consoleEntries ?? []),
              ].slice(0, 50),
            },
          })
        ),

      clearConsoleEntries: () =>
        set((state) =>
          syncActiveWorkflow(state, {
            execution: {
              ...state.execution,
              consoleEntries: [],
            },
          })
        ),
    }),
    {
      name: "flowra-workspace-v3",
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
        variables: state.variables,
      }),
    }
  )
);

function createInitialWorkspace() {
  const collection = makeCollection("Demo collection");
  const sampleSteps: Step[] = [
    {
      id: "demo-extract-first",
      type: "extract",
      config: {
        format: "html",
        rules: {
          token: "",
          status: ".status",
        },
      },
    },
    {
      id: "demo-login-request",
      type: "http_request",
      config: {
        method: "POST",
        url: "",
        headers: {
          Authorization: "{{steps.login.token}}",
        },
        body: {
          email: "{{input.email}}",
          token: "{{extract.missingToken}}",
        },
        csrf_fetch_url: "",
        csrf_selector: "",
        csrf_field_name: "",
      },
    },
    {
      id: "demo-condition",
      type: "condition",
      config: {
        field: "",
        op: "equals",
        value: "ready",
      },
    },
    {
      id: "demo-form-submit",
      type: "form_submit",
      config: {
        form_selector: "",
        base_url: "https://legacy.example.test",
        overrides: {
          session: "{{extract.token}}",
        },
      },
    },
  ];
  const sampleBranchTargets = {
    "demo-condition": {
      trueStepId: "demo-form-submit",
    },
  };
  const sampleErrors = validateWorkflow(sampleSteps, sampleBranchTargets);
  const workflow = makeWorkflow(collection.id, "Validation display sample", {
    description: "Shows inline warnings and errors directly on request-step cards.",
    workflow: { steps: sampleSteps },
    branchTargets: sampleBranchTargets,
    selectedStepId: sampleSteps[0].id,
    errors: sampleErrors,
  });
  collection.workflowIds = [workflow.id];

  return {
    collections: { [collection.id]: collection },
    workflows: { [workflow.id]: workflow },
    variables: {
      ...defaultVariables,
      tenant: cloneVariableMaps(defaultVariables.tenant),
      collections: {
        [collection.id]: makeEmptyCollectionVariableScope(defaultVariables.environments),
      },
    },
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
    description: "",
    isOnline: false,
    accessRole: "Collection",
    workflowIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

function sanitizeEnvironmentName(name: string) {
  return name.trim().replace(/\s+/g, "-").toLowerCase();
}

function makeEmptyCollectionVariableScope(environments: string[]) {
  return Object.fromEntries(environments.map((environment) => [environment, {}]));
}

function addCollectionVariableScope(variables: EnvironmentVariableSet, collectionId: string) {
  return {
    ...variables,
    collections: {
      ...variables.collections,
      [collectionId]: makeEmptyCollectionVariableScope(variables.environments),
    },
  };
}

function removeCollectionVariableScope(variables: EnvironmentVariableSet, collectionId: string) {
  const collections = { ...variables.collections };
  delete collections[collectionId];
  return { ...variables, collections };
}

function renameEnvironmentRecord(
  record: Record<string, Record<string, string>>,
  oldName: string,
  newName: string
) {
  const next = { ...record };
  next[newName] = next[oldName] ?? {};
  delete next[oldName];
  return next;
}

function omitEnvironmentRecord(record: Record<string, Record<string, string>>, name: string) {
  const next = { ...record };
  delete next[name];
  return next;
}

function cloneVariableMaps(record: Record<string, Record<string, string>>) {
  return JSON.parse(JSON.stringify(record)) as Record<string, Record<string, string>>;
}

function backendWorkflowToStoreWorkflow(
  workflow: BackendWorkflow,
  fallbackCollectionId: string
): CollectionWorkflow {
  const definition = workflow.definition ?? workflow.Definition ?? { steps: [] };
  return {
    id: workflow.id,
    collectionId: workflow.collection_id ?? fallbackCollectionId,
    name: workflow.name,
    description: workflow.description ?? "",
    isOnline: workflowIsOnline(workflow),
    accessRole: workflowAccessRole(workflow),
    workflow: definition,
    branchTargets: branchTargetsFromDefinition(definition),
    selectedStepId: definition.steps[0]?.id,
    collapsedStepIds: [],
    errors: validateWorkflow(definition.steps, branchTargetsFromDefinition(definition)),
    execution: { ...defaultExecution },
    createdAt: workflow.created_at,
    updatedAt: workflow.updated_at,
  };
}

function workflowIsOnline(workflow: BackendWorkflow) {
  return workflow.is_online ?? workflow.IsOnline ?? false;
}

function workflowAccessRole(workflow: BackendWorkflow) {
  return workflow.access_role ?? workflow.AccessRole ?? "Collection";
}

function branchTargetsFromDefinition(definition: WorkflowDefinition) {
  return Object.fromEntries(
    definition.steps
      .filter((step) => step.type === "condition")
      .map((step) => [
        step.id,
        {
          trueStepId: step.next_true,
          falseStepId: step.next_false,
        },
      ])
  );
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
    isOnline: false,
    accessRole: "Collection",
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
    execution: {
      ...defaultExecution,
      ...(workflow?.execution ?? {}),
      consoleEntries: workflow?.execution?.consoleEntries ?? [],
      traces: workflow?.execution?.traces ?? [],
    },
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
  patch: Partial<Pick<CollectionWorkflow, "name" | "description" | "isOnline" | "accessRole">>
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

function buildDSLFromSteps(
  sourceSteps: Step[],
  branchTargets: Record<string, BranchTargets>
): WorkflowDefinition {
  const stepIds = new Set(sourceSteps.map((step) => step.id));
  const steps = sourceSteps.map((step, index) => {
    const nextStepId = sourceSteps[index + 1]?.id;
    const base = cloneStep(step, step.id);

    if (base.type === "condition") {
      const targets = branchTargets[base.id] ?? {};
      return {
        ...base,
        next: undefined,
        next_true: targets.trueStepId && stepIds.has(targets.trueStepId) ? targets.trueStepId : undefined,
        next_false: targets.falseStepId && stepIds.has(targets.falseStepId) ? targets.falseStepId : undefined,
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

function syncCurrentWorkflowToBackend(state: WorkflowState) {
  const workflowId = state.activeWorkflowId;
  const workflow = workflowId ? state.workflows[workflowId] : undefined;
  if (!workflowId || !workflow) return;
  void updateBackendWorkflow(workflowId, {
    definition: buildDSLFromSteps(workflow.workflow.steps, workflow.branchTargets),
  }).catch(() => undefined);
}

function syncWorkflowMetaToBackend(state: WorkflowState, workflowId: string) {
  const workflow = state.workflows[workflowId];
  if (!workflow) return;
  void updateBackendWorkflow(workflowId, {
    name: workflow.name,
    description: workflow.description,
  }).catch(() => undefined);
}
