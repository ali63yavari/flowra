import type { ExecutionResponseDebug } from "@/lib/types";

export type ResponseFormat = "json" | "table" | "html" | "xml" | "raw" | "invalid_json";

export interface ParsedResponse {
  format: ResponseFormat;
  raw: string;
  parsed?: unknown;
  tableCapable: boolean;
  parseError?: string;
  contentType?: string;
}

export function parseResponseContent(input: {
  body?: unknown;
  contentType?: string;
  parsedBody?: unknown;
  bodyFormat?: string;
}): ParsedResponse {
  const contentType = input.contentType ?? "";
  const raw = stringifyBody(input.body);
  const hintedFormat = normalizeFormat(input.bodyFormat);
  const parsedFromBackend = input.parsedBody;

  if (parsedFromBackend !== undefined) {
    return {
      format: isObjectArray(parsedFromBackend) ? "table" : "json",
      raw,
      parsed: parsedFromBackend,
      tableCapable: isObjectArray(parsedFromBackend),
      contentType,
    };
  }

  const lowerType = contentType.toLowerCase();
  const trimmed = raw.trim();
  const lowerBody = trimmed.toLowerCase();
  const shouldParseJson =
    hintedFormat === "json" ||
    lowerType.includes("json") ||
    lowerType.includes("+json") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[");

  if (shouldParseJson) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        format: isObjectArray(parsed) ? "table" : "json",
        raw,
        parsed,
        tableCapable: isObjectArray(parsed),
        contentType,
      };
    } catch (error) {
      return {
        format: "invalid_json",
        raw,
        tableCapable: false,
        parseError: error instanceof Error ? error.message : "Invalid JSON response.",
        contentType,
      };
    }
  }

  if (
    hintedFormat === "html" ||
    lowerType.includes("html") ||
    lowerBody.startsWith("<!doctype html") ||
    lowerBody.startsWith("<html")
  ) {
    return { format: "html", raw, tableCapable: false, contentType };
  }

  if (
    hintedFormat === "xml" ||
    lowerType.includes("xml") ||
    lowerType.includes("soap") ||
    lowerBody.startsWith("<?xml") ||
    lowerBody.startsWith("<soap") ||
    lowerBody.includes("<soap:envelope")
  ) {
    return { format: "xml", raw: formatXml(raw), tableCapable: false, contentType };
  }

  return { format: "raw", raw, tableCapable: false, contentType };
}

export function parseExecutionResponse(response?: ExecutionResponseDebug | null): ParsedResponse {
  return parseResponseContent({
    body: response?.body ?? "",
    contentType: response?.content_type,
    parsedBody: response?.parsed_body,
    bodyFormat: response?.body_format,
  });
}

export function stringifyPretty(value: unknown) {
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
}

export function stringifyRaw(value: unknown) {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export function isObjectArray(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => isPlainObject(item));
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function tableColumns(rows: Record<string, unknown>[]) {
  return Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
}

function stringifyBody(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function normalizeFormat(format?: string): ResponseFormat | undefined {
  if (!format) return undefined;
  if (format === "json" || format === "html" || format === "xml" || format === "invalid_json") {
    return format;
  }
  if (format === "text") return "raw";
  return undefined;
}

function formatXml(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return value;
  return trimmed
    .replace(/>\s*</g, ">\n<")
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
}
