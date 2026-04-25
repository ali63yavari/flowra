export type StepType =
    | "http_request"
    | "form_submit"
    | "extract"
    | "browser"
    | "condition";

export interface Step {
    id: string;
    type: StepType;
    config: any;

    next?: string;      // linear
    next_true?: string; // branching
    next_false?: string;
}

export interface WorkflowDefinition {
    steps: Step[];
}