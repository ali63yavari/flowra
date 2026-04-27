"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/IconButton";
import type { Step } from "@/lib/types";

export default function EndpointAccessPanel({
  workflowId,
  steps,
}: {
  workflowId?: string;
  steps: Step[];
}) {
  const [open, setOpen] = useState(false);
  const [snippetOpen, setSnippetOpen] = useState(false);
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
      setSnippetOpen(false);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  };

  return (
    <section className="relative shrink-0">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-6 items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">POST</span>
          Endpoint
          <Icon name={open ? "chevronDown" : "chevronRight"} className="h-3 w-3" />
        </button>
        <div className="relative">
          <button
            type="button"
            title={copied ? `Copied ${copied}` : "Copy script"}
            onClick={() => setSnippetOpen((value) => !value)}
            className="inline-flex h-6 items-center gap-1 rounded border border-slate-200 bg-white px-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <Icon name="copy" className="h-3 w-3" />
            <Icon name={snippetOpen ? "chevronDown" : "chevronRight"} className="h-3 w-3" />
          </button>
          {snippetOpen ? (
            <div className="absolute right-0 top-7 z-[10001] w-32 overflow-hidden rounded border border-slate-200 bg-white py-1 text-xs shadow-xl">
              <SnippetMenuItem icon="terminal" label="curl" onClick={() => copySnippet("curl")} />
              <SnippetMenuItem icon="python" label="Python" onClick={() => copySnippet("python")} />
              <SnippetMenuItem icon="braces" label="Go" onClick={() => copySnippet("go")} />
            </div>
          ) : null}
        </div>
      </div>
      {open ? (
        <div className="absolute right-0 top-7 z-[10000] w-[min(620px,calc(100vw-420px))] min-w-[360px] rounded border border-slate-200 bg-slate-50 px-2 py-1.5 shadow-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">POST</span>
            <code className="min-w-[180px] flex-1 break-all text-xs leading-5 text-slate-700">{endpoint}</code>
          </div>
          <div className="mt-1 flex flex-wrap items-start gap-x-3 gap-y-0.5 text-[11px] text-slate-600">
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

function SnippetMenuItem({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: "terminal" | "python" | "braces";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-slate-700 hover:bg-slate-50"
    >
      <Icon name={icon} className="h-3.5 w-3.5 text-slate-500" />
      {label}
    </button>
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
