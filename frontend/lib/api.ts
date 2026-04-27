import type {
  EnvironmentVariableSet,
  ExecutionResponseDebug,
  ExecutionTraceEntry,
  WorkflowDefinition,
} from "@/lib/types";

export type ExecutionInput = Record<string, string | number | boolean | null>;

export type ExecuteDirectResponse =
  | {
      status: "success";
      data: Record<string, unknown>;
      input?: Record<string, unknown>;
      variables?: Record<string, unknown>;
      extracted?: Record<string, unknown>;
      last_response?: ExecutionResponseDebug;
      traces?: ExecutionTraceEntry[];
    }
  | {
      status: "error";
      error: string;
      data?: Record<string, unknown>;
      input?: Record<string, unknown>;
      variables?: Record<string, unknown>;
      extracted?: Record<string, unknown>;
      last_response?: ExecutionResponseDebug;
      traces?: ExecutionTraceEntry[];
      result?: {
        data?: Record<string, unknown>;
        input?: Record<string, unknown>;
        variables?: Record<string, unknown>;
        extracted?: Record<string, unknown>;
        last_response?: ExecutionResponseDebug;
        traces?: ExecutionTraceEntry[];
      };
    };

interface ExecuteDirectOptions {
  environment?: string;
  tenantVariables?: Record<string, string>;
  collectionVariables?: Record<string, string>;
  trace?: boolean;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "local-flowra-key";

export interface BackendCollection {
  id: string;
  name: string;
  description?: string;
  is_online?: boolean;
  access_role?: string;
  IsOnline?: boolean;
  AccessRole?: string;
  created_at: string;
  updated_at: string;
  workflows: BackendWorkflow[];
}

export interface BackendWorkflow {
  id: string;
  collection_id: string;
  name: string;
  description?: string;
  is_online?: boolean;
  access_role?: string;
  IsOnline?: boolean;
  AccessRole?: string;
  definition?: WorkflowDefinition;
  Definition?: WorkflowDefinition;
  created_at: string;
  updated_at: string;
}

export interface BackendEnvironment {
  id: string;
  name: string;
  is_default: boolean;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}.`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function listCollections() {
  return apiFetch<{ collections: BackendCollection[] }>("/collections");
}

export async function createBackendCollection(
  id: string,
  name: string,
  data: { description?: string; isOnline?: boolean; accessRole?: string } = {}
) {
  return apiFetch<BackendCollection>("/collections", {
    method: "POST",
    body: JSON.stringify({
      id,
      name,
      description: data.description ?? "",
      is_online: data.isOnline ?? false,
      access_role: data.accessRole ?? "Collection",
    }),
  });
}

export async function updateBackendCollection(
  id: string,
  data: { name?: string; description?: string; isOnline?: boolean; accessRole?: string }
) {
  return apiFetch<BackendCollection>(`/collections/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: data.name,
      description: data.description,
      is_online: data.isOnline,
      access_role: data.accessRole,
    }),
  });
}

export async function deleteBackendCollection(id: string) {
  return apiFetch<void>(`/collections/${id}`, { method: "DELETE" });
}

export async function createBackendWorkflow(
  collectionId: string,
  data: { id: string; name: string; description?: string; definition: WorkflowDefinition }
) {
  return apiFetch<BackendWorkflow>(`/collections/${collectionId}/workflows`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateBackendWorkflow(
  id: string,
  data: { name?: string; description?: string; definition?: WorkflowDefinition }
) {
  return apiFetch<BackendWorkflow>(`/workflows/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteBackendWorkflow(id: string) {
  return apiFetch<void>(`/workflows/${id}`, { method: "DELETE" });
}

export async function duplicateBackendWorkflow(id: string, copyId: string) {
  return apiFetch<BackendWorkflow>(`/workflows/${id}/duplicate`, {
    method: "POST",
    body: JSON.stringify({ id: copyId }),
  });
}

export async function listEnvironments() {
  return apiFetch<{ environments: BackendEnvironment[] }>("/environments");
}

export async function createBackendEnvironment(name: string) {
  return apiFetch<BackendEnvironment>("/environments", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function renameBackendEnvironment(oldName: string, newName: string) {
  const response = await listEnvironments();
  const environment = response.environments.find((item) => item.name === oldName || item.id === oldName);
  if (!environment) return;
  return apiFetch<BackendEnvironment>(`/environments/${environment.id}`, {
    method: "PATCH",
    body: JSON.stringify({ name: newName, is_default: environment.is_default }),
  });
}

export async function deleteBackendEnvironment(name: string) {
  const response = await listEnvironments();
  const environment = response.environments.find((item) => item.name === name || item.id === name);
  if (!environment) return;
  return apiFetch<void>(`/environments/${environment.id}`, { method: "DELETE" });
}

export async function replaceBackendVariables({
  scope,
  collectionId,
  environment,
  variables,
}: {
  scope: "tenant" | "collection";
  collectionId?: string;
  environment: string;
  variables: Record<string, string>;
}) {
  const params = new URLSearchParams({ scope, environment });
  if (collectionId) params.set("collection_id", collectionId);
  return apiFetch<{ status: "success" }>(`/variables?${params.toString()}`, {
    method: "PUT",
    body: JSON.stringify({ variables }),
  });
}

export async function listBackendVariables({
  scope,
  collectionId,
  environment,
  reveal = true,
}: {
  scope: "tenant" | "collection";
  collectionId?: string;
  environment: string;
  reveal?: boolean;
}) {
  const params = new URLSearchParams({ scope, environment, reveal: String(reveal) });
  if (collectionId) params.set("collection_id", collectionId);
  return apiFetch<{ variables: Array<{ key: string; value: string }> }>(`/variables?${params.toString()}`);
}

export async function loadBackendVariableSet(collectionIds: string[]): Promise<EnvironmentVariableSet> {
  const environmentResponse = await listEnvironments();
  const environments = environmentResponse.environments.map((environment) => environment.name);
  const activeEnvironment =
    environmentResponse.environments.find((environment) => environment.is_default)?.name ??
    environments[0] ??
    "prod";
  const tenant: EnvironmentVariableSet["tenant"] = {};
  const collections: EnvironmentVariableSet["collections"] = {};

  await Promise.all(
    environments.map(async (environment) => {
      const response = await listBackendVariables({ scope: "tenant", environment });
      tenant[environment] = Object.fromEntries(response.variables.map((variable) => [variable.key, variable.value]));
    })
  );

  await Promise.all(
    collectionIds.flatMap((collectionId) =>
      environments.map(async (environment) => {
        const response = await listBackendVariables({ scope: "collection", collectionId, environment });
        collections[collectionId] = {
          ...(collections[collectionId] ?? {}),
          [environment]: Object.fromEntries(response.variables.map((variable) => [variable.key, variable.value])),
        };
      })
    )
  );

  return {
    environments,
    activeEnvironment,
    tenant,
    collections,
  };
}

export async function executeDirect(
  workflow: WorkflowDefinition,
  input: ExecutionInput,
  options: ExecuteDirectOptions = {}
): Promise<ExecuteDirectResponse> {
  if (!BASE_URL) {
    return {
      status: "error",
      error: "NEXT_PUBLIC_API_URL is not configured.",
    };
  }

  const res = await fetch(`${BASE_URL}/execute-direct`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({
      workflow,
      input,
      environment: options.environment,
      tenant_variables: options.tenantVariables,
      collection_variables: options.collectionVariables,
      trace: options.trace ?? true,
    }),
  });

  return (await res.json()) as ExecuteDirectResponse;
}
