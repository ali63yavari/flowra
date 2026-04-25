import type { WorkflowTemplate } from "@/lib/types";

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "login-csrf",
    name: "Login form with CSRF",
    description: "Fetch a login page, extract a token, then submit credentials.",
    steps: [
      {
        id: "fetch-login",
        type: "http_request",
        config: {
          method: "GET",
          url: "https://example.com/login",
          headers: {},
          body: {},
          csrf_fetch_url: "",
          csrf_selector: "",
          csrf_field_name: "",
        },
      },
      {
        id: "extract-token",
        type: "extract",
        config: {
          format: "html",
          rules: { csrf: "input[name=csrf]" },
        },
      },
      {
        id: "submit-login",
        type: "form_submit",
        config: {
          form_selector: "form#login",
          base_url: "https://example.com",
          overrides: {
            email: "{{input.email}}",
            password: "{{input.password}}",
            csrf: "{{extract.csrf}}",
          },
        },
      },
    ],
  },
  {
    id: "api-extract",
    name: "API request then extract",
    description: "Call a page endpoint and extract one named value.",
    steps: [
      {
        id: "fetch-page",
        type: "http_request",
        config: {
          method: "GET",
          url: "https://example.com/dashboard",
          headers: {},
          body: {},
          csrf_fetch_url: "",
          csrf_selector: "",
          csrf_field_name: "",
        },
      },
      {
        id: "extract-status",
        type: "extract",
        config: {
          format: "html",
          rules: { status: ".status" },
        },
      },
    ],
  },
  {
    id: "browser-login",
    name: "Browser navigate/fill/click",
    description: "Drive a browser through a simple login flow.",
    steps: [
      {
        id: "browser-login-flow",
        type: "browser",
        config: {
          actions: [
            { type: "navigate", url: "https://example.com/login" },
            { type: "fill", selector: "input[name=email]", value: "{{input.email}}" },
            { type: "fill", selector: "input[name=password]", value: "{{input.password}}" },
            { type: "click", selector: "button[type=submit]" },
            { type: "wait", selector: ".dashboard" },
          ],
        },
      },
    ],
  },
  {
    id: "extract-condition",
    name: "Extract then branch",
    description: "Read a status value and route to success or fallback requests.",
    steps: [
      {
        id: "fetch-status",
        type: "http_request",
        config: {
          method: "GET",
          url: "https://example.com/status",
          headers: {},
          body: {},
          csrf_fetch_url: "",
          csrf_selector: "",
          csrf_field_name: "",
        },
      },
      {
        id: "extract-status-value",
        type: "extract",
        config: {
          format: "html",
          rules: { status: ".status" },
        },
      },
      {
        id: "check-status",
        type: "condition",
        config: { field: "status", op: "equals", value: "ready" },
      },
      {
        id: "ready-request",
        type: "http_request",
        config: {
          method: "GET",
          url: "https://example.com/ready",
          headers: {},
          body: {},
          csrf_fetch_url: "",
          csrf_selector: "",
          csrf_field_name: "",
        },
      },
      {
        id: "fallback-request",
        type: "http_request",
        config: {
          method: "GET",
          url: "https://example.com/pending",
          headers: {},
          body: {},
          csrf_fetch_url: "",
          csrf_selector: "",
          csrf_field_name: "",
        },
      },
    ],
    branchTargets: {
      "check-status": {
        trueStepId: "ready-request",
        falseStepId: "fallback-request",
      },
    },
  },
  {
    id: "php-form",
    name: "Submit PHP form",
    description: "Load a legacy PHP form and submit mapped inputs.",
    steps: [
      {
        id: "load-php-form",
        type: "http_request",
        config: {
          method: "GET",
          url: "https://example.com/contact.php",
          headers: {},
          body: {},
          csrf_fetch_url: "",
          csrf_selector: "",
          csrf_field_name: "",
        },
      },
      {
        id: "submit-php-form",
        type: "form_submit",
        config: {
          form_selector: "form",
          base_url: "https://example.com",
          overrides: {
            name: "{{input.name}}",
            email: "{{input.email}}",
            message: "{{input.message}}",
          },
        },
      },
    ],
  },
];
