"use client";

import type { ReactNode } from "react";

export type IconName =
  | "alertCircle"
  | "alertTriangle"
  | "braces"
  | "chevronDown"
  | "chevronRight"
  | "collapseAll"
  | "copy"
  | "edit"
  | "expandAll"
  | "fileCode"
  | "fileInput"
  | "gitBranch"
  | "globe"
  | "info"
  | "key"
  | "list"
  | "listChecks"
  | "mousePointerClick"
  | "plus"
  | "play"
  | "python"
  | "scanSearch"
  | "terminal"
  | "trash"
  | "check"
  | "eye"
  | "eyeOff"
  | "x";

const iconPaths: Record<IconName, ReactNode> = {
  alertCircle: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </>
  ),
  alertTriangle: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  braces: (
    <>
      <path d="M8 3H7a3 3 0 0 0-3 3v3a3 3 0 0 1-2 3 3 3 0 0 1 2 3v3a3 3 0 0 0 3 3h1" />
      <path d="M16 3h1a3 3 0 0 1 3 3v3a3 3 0 0 0 2 3 3 3 0 0 0-2 3v3a3 3 0 0 1-3 3h-1" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  collapseAll: (
    <>
      <path d="M8 3v5H3" />
      <path d="M16 3v5h5" />
      <path d="M8 21v-5H3" />
      <path d="M16 21v-5h5" />
      <path d="m3 3 5 5" />
      <path d="m21 3-5 5" />
      <path d="m3 21 5-5" />
      <path d="m21 21-5-5" />
    </>
  ),
  expandAll: (
    <>
      <path d="M3 8V3h5" />
      <path d="M21 8V3h-5" />
      <path d="M3 16v5h5" />
      <path d="M21 16v5h-5" />
      <path d="m3 3 6 6" />
      <path d="m21 3-6 6" />
      <path d="m3 21 6-6" />
      <path d="m21 21-6-6" />
    </>
  ),
  copy: (
    <>
      <rect width="13" height="13" x="8" y="8" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  fileInput: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M12 18v-6" />
      <path d="m9 15 3 3 3-3" />
    </>
  ),
  fileCode: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="m10 13-2 2 2 2" />
      <path d="m14 17 2-2-2-2" />
    </>
  ),
  gitBranch: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M6 9v3a6 6 0 0 0 6 6h3" />
      <path d="M6 9v13" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 0 20" />
      <path d="M12 2a15.3 15.3 0 0 0 0 20" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </>
  ),
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3" />
      <path d="m18 5 3 3" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </>
  ),
  listChecks: (
    <>
      <path d="m3 7 1.5 1.5L7 5" />
      <path d="M10 6h11" />
      <path d="m3 14 1.5 1.5L7 12" />
      <path d="M10 13h11" />
      <path d="M10 20h11" />
    </>
  ),
  mousePointerClick: (
    <>
      <path d="M14 4.1 12 6" />
      <path d="m5.1 8-2.9-.8" />
      <path d="m6 12-1.9 2" />
      <path d="M8.2 2.2 9 5.1" />
      <path d="M9.6 9.6 19 19" />
      <path d="m13 13 3-1-4-4-1 3" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  play: <path d="M8 5v14l11-7Z" />,
  python: (
    <>
      <path d="M12 3h3a4 4 0 0 1 4 4v3H9a4 4 0 0 0-4 4v1" />
      <path d="M12 21H9a4 4 0 0 1-4-4v-3h10a4 4 0 0 0 4-4V9" />
      <path d="M9 7h.01" />
      <path d="M15 17h.01" />
    </>
  ),
  scanSearch: (
    <>
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <circle cx="11" cy="11" r="3" />
      <path d="m16 16-2.2-2.2" />
    </>
  ),
  terminal: (
    <>
      <path d="m4 17 6-6-6-6" />
      <path d="M12 19h8" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </>
  ),
  check: (
    <>
      <path d="M20 6 9 17l-5-5" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6a3 3 0 0 0 3.8 3.8" />
      <path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c6.5 0 10 8 10 8a17.8 17.8 0 0 1-3.2 4.5" />
      <path d="M6.1 6.1C3.5 8 2 12 2 12s3.5 8 10 8a10.5 10.5 0 0 0 4.1-.8" />
    </>
  ),
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
};

const toneClasses = {
  neutral: "text-slate-500 hover:bg-slate-100 hover:text-slate-950",
  inverse: "text-slate-300 hover:bg-white/10 hover:text-white",
  primary: "bg-blue-50 text-blue-700 hover:bg-blue-100",
  success: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  danger: "bg-red-50 text-red-700 hover:bg-red-100",
  inverseDanger: "text-red-200 hover:bg-red-500/20 hover:text-red-100",
};

export function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {iconPaths[name]}
    </svg>
  );
}

export function IconButton({
  label,
  icon,
  tone = "neutral",
  onClick,
  disabled,
  className = "",
}: {
  label: string;
  icon: IconName;
  tone?: keyof typeof toneClasses;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex h-8 w-8 items-center justify-center rounded transition disabled:cursor-not-allowed disabled:opacity-50",
        toneClasses[tone],
        className,
      ].join(" ")}
    >
      <Icon name={icon} />
    </button>
  );
}
