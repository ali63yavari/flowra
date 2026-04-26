"use client";

import { useMemo, useState } from "react";
import { Icon, IconButton, type IconName } from "@/components/ui/IconButton";
import type { Step } from "@/lib/types";

export default function EndpointAccessPanel({
  workflowId,
  steps,
}: {
  workflowId?: string;
  steps: Step[];
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"curl" | "python" | "go" | null>(null);
  const endpoint = useMemo(() => buildWorkflowEndpoint(workflowId), [workflowId]);
  const inputFields = useMemo(() => collectWorkflowInputFields(steps), [steps]);
  const inputExample = useMemo(() => buildInputExample(inputFields), [inputFields]);
  const prettyBody = useMemo(() => JSON.stringify(inputExample, null, 2), [inputExample]);
  const compactBody = useMemo(() => JSON.stringify(inputExample), [inputExample]);
  const apiKey = process.env.NEXT_PUBLIC_API_KEY || "FLOWRA_API_KEY";

  const snippets = useMemo(
    () => ({
      curl: buildCurlSnippet(endpoint, apiKey, compactBody),
      python: buildPythonSnippet(endpoint, apiKey, prettyBody),
      go: buildGoSnippet(endpoint, apiKey, compactBody),
    }),
    [endpoint, apiKey, compactBody, prettyBody]
  );

  const copySnippet = async (kind: "curl" | "python" | "go") => {
    try {
      await navigator.clipboard.writeText(snippets[kind]);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  };

  return (
    <section className="mt-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-7 items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">POST</span>
          Endpoint
          <Icon name={open ? "chevronDown" : "chevronRight"} className="h-3.5 w-3.5" />
        </button>
        <SnippetButton
          label={copied === "curl" ? "Copied curl" : "Copy curl request"}
          icon="terminal"
          onClick={() => copySnippet("curl")}
        />
        <SnippetButton
          label={copied === "python" ? "Copied Python" : "Copy Python snippet"}
          icon="python"
          onClick={() => copySnippet("python")}
        />
        <SnippetButton
          label={copied === "go" ? "Copied Go" : "Copy Go snippet"}
          icon="braces"
          onClick={() => copySnippet("go")}
        />
      </div>
      {open ? (
        <div className="mt-2 rounded border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">POST</span>
            <code className="min-w-[180px] flex-1 break-all text-xs leading-5 text-slate-700">{endpoint}</code>
          </div>
          <div className="mt-2 flex flex-wrap items-start gap-x-4 gap-y-1 text-xs text-slate-600">
            <span className="inline-flex min-w-0 items-center gap-1">
              <Icon name="key" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="font-medium text-slate-700">X-API-Key</span>
            </span>
            <span className="inline-flex min-w-0 items-start gap-1">
              <Icon name="listChecks" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="font-medium text-slate-700">Inputs:</span>
              <span className="break-words">
                {inputFields.length ? inputFields.join(", ") : "none"}
              </span>
            </span>
            <span className="inline-flex min-w-0 items-start gap-1">
              <Icon name="fileCode" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="font-medium text-slate-700">Body:</span>
              <code className="break-all">{compactBody}</code>
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SnippetButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: IconName;
  onClick: () => void;
}) {
  return (
    <IconButton
      label={label}
      icon={icon}
      className="h-7 w-7 rounded border border-slate-200 bg-white [&_svg]:h-3.5 [&_svg]:w-3.5"
      onClick={onClick}
    />
  );
}

function buildWorkflowEndpoint(workflowId?: string) {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  return `${baseURL.replace(/\/$/, "")}/execute/${workflowId || "workflow_id"}`;
}

function collectWorkflowInputFields(steps: Step[]): string[] {
  const keys = new Set<string>();
  steps.forEach((step) => {
    getConfigStrings(step).forEach((value) => {
      Array.from(value.matchAll(/\{\{\s*input\.([a-zA-Z0-9_-]+)\s*\}\}/g)).forEach((match) => {
        if (match[1]) keys.add(match[1]);
      });
    });
  });

  return Array.from(keys).sort();
}

function buildInputExample(inputFields: string[]): Record<string, string> {
  return Object.fromEntries(inputFields.map((key) => [key, `<${key}>`]));
}

function getConfigStrings(step: Step): string[] {
  switch (step.type) {
    case "http_request":
      return [
        step.config.url,
        step.config.csrf_fetch_url,
        step.config.csrf_selector,
        step.config.csrf_field_name,
        ...Object.values(step.config.headers),
        ...Object.values(step.config.body),
      ];
    case "extract":
      return Object.values(step.config.rules);
    case "condition":
      return [step.config.field, step.config.value];
    case "form_submit":
      return [
        step.config.form_selector,
        step.config.base_url,
        ...Object.values(step.config.overrides),
      ];
    case "browser":
      return step.config.actions.flatMap((action) => [
        action.url ?? "",
        action.selector ?? "",
        action.value ?? "",
      ]);
  }
}

function buildCurlSnippet(endpoint: string, apiKey: string, body: string) {
  return `curl -X POST '${endpoint}' \\
  -H 'Content-Type: application/json' \\
  -H 'X-API-Key: ${apiKey}' \\
  -d '${body}'`;
}

function buildPythonSnippet(endpoint: string, apiKey: string, body: string) {
  return `import json
import requests

payload = json.loads("""${body}""")

response = requests.post(
    "${endpoint}",
    headers={
        "Content-Type": "application/json",
        "X-API-Key": "${apiKey}",
    },
    json=payload,
)

print(response.status_code)
print(response.json())`;
}

function buildGoSnippet(endpoint: string, apiKey: string, body: string) {
  return `package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
)

func main() {
	body := []byte(\`${body}\`)
	req, err := http.NewRequest("POST", "${endpoint}", bytes.NewReader(body))
	if err != nil {
		panic(err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", "${apiKey}")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()

	data, _ := io.ReadAll(res.Body)
	fmt.Println(res.Status)
	fmt.Println(string(data))
}`;
}
