import type { BrowserAction, Step } from "@/lib/types";

export function summarizeStep(step: Step): string {
  return getStepSummary(step).primary;
}

export function getStepSummary(step: Step): { primary: string; secondary: string } {
  switch (step.type) {
    case "http_request": {
      const headerCount = Object.keys(step.config.headers).length;
      const bodyCount = Object.keys(step.config.body).length;
      const csrfEnabled = Boolean(
        step.config.csrf_fetch_url || step.config.csrf_selector || step.config.csrf_field_name
      );
      return {
        primary: step.config.url.trim()
          ? `${step.config.method} ${step.config.url}`
          : `${step.config.method} request needs a URL`,
        secondary: [
          `${headerCount} headers`,
          `${bodyCount} body fields`,
          csrfEnabled ? "CSRF helper configured" : "No CSRF helper",
        ].join(" · "),
      };
    }
    case "extract": {
      const entries = Object.entries(step.config.rules);
      return {
        primary: entries.length
          ? entries
              .slice(0, 2)
              .map(([name, selector]) => `Extract ${name || "value"} from ${selector || "selector"}`)
              .join(", ")
          : "Add extraction rules",
        secondary: entries.length
          ? `${entries.length} extraction ${entries.length === 1 ? "rule" : "rules"} · HTML response`
          : "Map CSS selectors to reusable variables",
      };
    }
    case "condition": {
      const hasCondition = step.config.field.trim();
      return {
        primary: hasCondition
          ? `If ${step.config.field} equals ${step.config.value || "value"}`
          : "Choose extracted value to compare",
        secondary: "Routes execution into true or false branch",
      };
    }
    case "form_submit": {
      const overrideCount = Object.keys(step.config.overrides).length;
      return {
        primary: step.config.form_selector.trim()
          ? `Submit form ${step.config.form_selector}`
          : "Choose a form selector",
        secondary: [
          step.config.base_url ? `Base ${step.config.base_url}` : "No base URL",
          `${overrideCount} overrides`,
        ].join(" · "),
      };
    }
    case "browser": {
      const actionTypes = step.config.actions.map((action) => action.type);
      return {
        primary: step.config.actions.length
          ? step.config.actions.slice(0, 2).map(formatAction).join(", ")
          : "Add browser actions",
        secondary: step.config.actions.length
          ? `${step.config.actions.length} actions · ${actionTypes.join(" → ")}`
          : "Compose navigate, fill, click, and wait actions",
      };
    }
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
