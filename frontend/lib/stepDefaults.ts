import type {
  BrowserConfig,
  ConditionConfig,
  ExtractConfig,
  FormSubmitConfig,
  HTTPRequestConfig,
  Step,
  StepConfig,
  StepType,
} from "@/lib/types";

export function getDefaultConfig(type: "http_request"): HTTPRequestConfig;
export function getDefaultConfig(type: "extract"): ExtractConfig;
export function getDefaultConfig(type: "condition"): ConditionConfig;
export function getDefaultConfig(type: "form_submit"): FormSubmitConfig;
export function getDefaultConfig(type: "browser"): BrowserConfig;
export function getDefaultConfig(type: StepType): StepConfig;
export function getDefaultConfig(type: StepType): StepConfig {
  switch (type) {
    case "http_request":
      return {
        method: "GET",
        url: "https://example.com",
        headers: {},
        body: {},
        csrf_fetch_url: "",
        csrf_selector: "",
        csrf_field_name: "",
      };
    case "extract":
      return {
        format: "html",
        rules: { token: ".csrf-token" },
      };
    case "condition":
      return {
        field: "token",
        op: "equals",
        value: "success",
      };
    case "form_submit":
      return {
        form_selector: "form",
        base_url: "",
        overrides: {},
      };
    case "browser":
      return {
        actions: [{ type: "navigate", url: "https://example.com" }],
      };
  }
}

export function createStep(id: string, type: StepType): Step {
  switch (type) {
    case "http_request":
      return { id, type, config: getDefaultConfig(type) };
    case "extract":
      return { id, type, config: getDefaultConfig(type) };
    case "condition":
      return { id, type, config: getDefaultConfig(type) };
    case "form_submit":
      return { id, type, config: getDefaultConfig(type) };
    case "browser":
      return { id, type, config: getDefaultConfig(type) };
  }
}
