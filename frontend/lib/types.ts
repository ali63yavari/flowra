export type StepType =
  | "http_request"
  | "form_submit"
  | "extract"
  | "browser"
  | "transform"
  | "condition";

export interface Step {
  id: string;
  type: StepType;
  name?: string;
  config: any;
  next?: string;
}

export interface WorkflowDefinition {
  steps: Step[];
}
