import type { BrowserAction, Step } from "@/lib/types";

export function summarizeStep(step: Step): string {
  switch (step.type) {
    case "http_request":
      return step.config.url.trim()
        ? `${step.config.method} ${step.config.url}`
        : `${step.config.method} request needs a URL`;
    case "extract": {
      const entries = Object.entries(step.config.rules);
      if (!entries.length) return "Add extraction rules";
      return entries
        .slice(0, 2)
        .map(([name, selector]) => `Extract ${name || "value"} from ${selector || "selector"}`)
        .join(", ");
    }
    case "condition":
      return step.config.field.trim()
        ? `If ${step.config.field} equals ${step.config.value || "value"}`
        : "Choose extracted value to compare";
    case "form_submit":
      return step.config.form_selector.trim()
        ? `Submit form ${step.config.form_selector}`
        : "Choose a form selector";
    case "browser":
      return step.config.actions.length
        ? step.config.actions.map(formatAction).join(", ")
        : "Add browser actions";
  }
}

function formatAction(action: BrowserAction): string {
  switch (action.type) {
    case "navigate":
      return action.url ? `Navigate ${action.url}` : "Navigate";
    case "fill":
      return action.selector ? `Fill ${action.selector}` : "Fill";
    case "click":
      return action.selector ? `Click ${action.selector}` : "Click";
    case "wait":
      return action.selector ? `Wait for ${action.selector}` : "Wait";
  }
}
