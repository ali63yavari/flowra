export type StepType =
  | "http_request"
  | "form_submit"
  | "extract"
  | "browser"
  | "condition";

export type ConditionOperator = "equals";

export interface HTTPRequestConfig {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers: Record<string, string>;
  body: Record<string, string>;
  csrf_fetch_url: string;
  csrf_selector: string;
  csrf_field_name: string;
}

export interface ExtractConfig {
  format: "html";
  rules: Record<string, string>;
}

export interface ConditionConfig {
  field: string;
  op: ConditionOperator;
  value: string;
}

export interface FormSubmitConfig {
  form_selector: string;
  base_url: string;
  overrides: Record<string, string>;
}

export interface BrowserAction {
  type: "navigate" | "fill" | "click" | "wait";
  url?: string;
  selector?: string;
  value?: string;
}

export interface BrowserConfig {
  actions: BrowserAction[];
}

export type StepConfig =
  | HTTPRequestConfig
  | ExtractConfig
  | ConditionConfig
  | FormSubmitConfig
  | BrowserConfig;

interface BaseStep<TType extends StepType, TConfig extends StepConfig> {
  id: string;
  type: TType;
  config: TConfig;
  next?: string;
  next_true?: string;
  next_false?: string;
}

export type HTTPRequestStep = BaseStep<"http_request", HTTPRequestConfig>;
export type ExtractStep = BaseStep<"extract", ExtractConfig>;
export type ConditionStep = BaseStep<"condition", ConditionConfig>;
export type FormSubmitStep = BaseStep<"form_submit", FormSubmitConfig>;
export type BrowserStep = BaseStep<"browser", BrowserConfig>;

export type Step =
  | HTTPRequestStep
  | ExtractStep
  | ConditionStep
  | FormSubmitStep
  | BrowserStep;

export interface WorkflowDefinition {
  steps: Step[];
}

export interface BranchTargets {
  trueStepId?: string;
  falseStepId?: string;
}

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: ValidationSeverity;
  type: "step" | "workflow" | "field";
  stepId?: string;
  field?: string;
  message: string;
}

export type ExecutionStatus = "idle" | "validating" | "running" | "success" | "failed";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: Step[];
  branchTargets?: Record<string, BranchTargets>;
}
