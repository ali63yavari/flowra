import type { StepType } from "@/lib/types";

export const nodeMeta: Record<
  StepType,
  {
    label: string;
    description: string;
    accent: string;
  }
> = {
  http_request: {
    label: "Call API",
    description: "Send an HTTP request and keep the latest response.",
    accent: "bg-blue-500",
  },
  extract: {
    label: "Extract Data",
    description: "Pull named values from the latest HTML response.",
    accent: "bg-emerald-500",
  },
  condition: {
    label: "If / Else",
    description: "Route execution based on an extracted value.",
    accent: "bg-amber-500",
  },
  form_submit: {
    label: "Submit Form",
    description: "Parse and submit a web form with mapped overrides.",
    accent: "bg-violet-500",
  },
  browser: {
    label: "Browser Step",
    description: "Navigate, fill, click, and wait in a browser session.",
    accent: "bg-rose-500",
  },
};

export const stepTypeOrder: StepType[] = [
  "http_request",
  "extract",
  "condition",
  "form_submit",
  "browser",
];
