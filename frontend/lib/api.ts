import type { WorkflowDefinition } from "@/lib/types";

export type ExecutionInput = Record<string, string | number | boolean | null>;

export type ExecuteDirectResponse =
  | { status: "success"; data: Record<string, unknown> }
  | { status: "error"; error: string };

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function executeDirect(
  workflow: WorkflowDefinition,
  input: ExecutionInput
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
      "X-API-Key": process.env.NEXT_PUBLIC_API_KEY ?? "",
    },
    body: JSON.stringify({
      workflow,
      input,
    }),
  });

  return (await res.json()) as ExecuteDirectResponse;
}
