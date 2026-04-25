import type { BranchTargets, Step, ValidationIssue } from "@/lib/types";

const templateRegex = /\{\{\s*([^}]+?)\s*\}\}/g;

export function collectTemplateRefs(value: string): string[] {
  return Array.from(value.matchAll(templateRegex), (match) => match[1].trim());
}

function valuesFromConfig(step: Step): string[] {
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

export function validateWorkflow(
  steps: Step[],
  branchTargets: Record<string, BranchTargets>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const stepIds = new Set(steps.map((step) => step.id));
  const extractNamesByIndex: Array<Set<string>> = [];
  const seenExtractNames = new Set<string>();

  steps.forEach((step, index) => {
    extractNamesByIndex[index] = new Set(seenExtractNames);
    if (step.type === "extract") {
      Object.keys(step.config.rules).forEach((name) => seenExtractNames.add(name));
    }
  });

  if (steps.length === 0) {
    issues.push({
      severity: "error",
      type: "workflow",
      message: "Add at least one workflow step before running.",
    });
    return issues;
  }

  steps.forEach((step, index) => {
    switch (step.type) {
      case "http_request":
        if (!step.config.url.trim()) {
          issues.push(stepError(step.id, "url", "HTTP request URL is required."));
        }
        if (!step.config.method) {
          issues.push(stepError(step.id, "method", "HTTP method is required."));
        }
        break;
      case "extract":
        if (index === 0) {
          issues.push(stepWarning(step.id, "rules", "Extract needs a previous response to read from."));
        }
        if (Object.keys(step.config.rules).length === 0) {
          issues.push(stepError(step.id, "rules", "Add at least one extraction rule."));
        }
        Object.entries(step.config.rules).forEach(([name, selector]) => {
          if (!name.trim() || !selector.trim()) {
            issues.push(stepError(step.id, "rules", "Extraction rules need both a name and selector."));
          }
        });
        break;
      case "condition": {
        if (!step.config.field.trim()) {
          issues.push(stepError(step.id, "field", "Condition field is required."));
        }
        if (step.config.op !== "equals") {
          issues.push(stepError(step.id, "op", "Only equals is supported by the backend today."));
        }
        const targets = branchTargets[step.id] ?? {};
        if (!targets.trueStepId || !stepIds.has(targets.trueStepId)) {
          issues.push(stepError(step.id, "next_true", "Choose a valid true branch target."));
        }
        if (!targets.falseStepId || !stepIds.has(targets.falseStepId)) {
          issues.push(stepError(step.id, "next_false", "Choose a valid false branch target."));
        }
        if (targets.trueStepId && targets.trueStepId === targets.falseStepId) {
          issues.push(stepWarning(step.id, "branches", "True and false branches point to the same step."));
        }
        break;
      }
      case "form_submit":
        if (!step.config.form_selector.trim()) {
          issues.push(stepError(step.id, "form_selector", "Form selector is required."));
        }
        break;
      case "browser":
        if (step.config.actions.length === 0) {
          issues.push(stepError(step.id, "actions", "Add at least one browser action."));
        }
        step.config.actions.forEach((action) => {
          if (action.type === "navigate" && !action.url?.trim()) {
            issues.push(stepError(step.id, "url", "Navigate actions need a URL."));
          }
          if (["fill", "click", "wait"].includes(action.type) && !action.selector?.trim()) {
            issues.push(stepError(step.id, "selector", `${action.type} actions need a selector.`));
          }
          if (action.type === "fill" && !action.value?.trim()) {
            issues.push(stepError(step.id, "value", "Fill actions need a value."));
          }
        });
        break;
    }

    valuesFromConfig(step).forEach((value) => {
      collectTemplateRefs(value).forEach((ref) => {
        const [namespace, key] = ref.split(".");
        if (!namespace || !key) {
          issues.push(stepError(step.id, "variables", `Invalid variable reference: {{${ref}}}.`));
          return;
        }
        if (!["input", "extract", "var"].includes(namespace)) {
          issues.push(stepError(step.id, "variables", `Unsupported variable namespace: ${namespace}.`));
          return;
        }
        if (namespace === "extract" && !extractNamesByIndex[index]?.has(key)) {
          issues.push(
            stepError(step.id, "variables", `Unknown extracted value before this step: ${key}.`)
          );
        }
      });
    });
  });

  return issues;
}

function stepError(stepId: string, field: string, message: string): ValidationIssue {
  return { severity: "error", type: "field", stepId, field, message };
}

function stepWarning(stepId: string, field: string, message: string): ValidationIssue {
  return { severity: "warning", type: "field", stepId, field, message };
}
