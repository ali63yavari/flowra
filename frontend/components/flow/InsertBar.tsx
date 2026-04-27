"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/IconButton";
import { nodeMeta, stepTypeOrder } from "@/lib/nodeMeta";
import type { StepType } from "@/lib/types";

const MENU_WIDTH = 288;
const MENU_HEIGHT = 342;

export default function InsertBar({
  onInsert,
  alwaysVisible = false,
}: {
  onInsert: (type: StepType) => void;
  alwaysVisible?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleInsert = (type: StepType) => {
    onInsert(type);
    setOpen(false);
  };

  const updateMenuPosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 8;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const openUp = spaceBelow < MENU_HEIGHT && rect.top > spaceBelow;
    const top = openUp
      ? Math.max(margin, rect.top - MENU_HEIGHT - margin)
      : Math.min(rect.bottom + margin, window.innerHeight - MENU_HEIGHT - margin);
    const left = Math.min(
      Math.max(margin, rect.left),
      window.innerWidth - MENU_WIDTH - margin
    );
    setMenuPosition({ left, top });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", closeOnOutside);
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("mousedown", closeOnOutside);
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  return (
    <div
      className={[
        "relative -ml-8 -mr-5 h-4 transition hover:opacity-100 focus-within:opacity-100 group-hover/step:opacity-100",
        alwaysVisible ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      <div className="absolute left-4 right-0 top-1/2 border-t border-dashed border-slate-300" />
      <button
        ref={buttonRef}
        type="button"
        aria-label="Add step"
        title="Add step"
        onClick={() => {
          updateMenuPosition();
          setOpen((value) => !value);
        }}
        className="absolute left-0 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 [&_svg]:h-3 [&_svg]:w-3"
      >
        <Icon name="plus" />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="fixed z-[10000] max-h-[min(420px,calc(100vh-16px))] w-72 overflow-auto rounded border border-slate-200 bg-white shadow-2xl"
          style={{
            left: menuPosition?.left ?? 8,
            top: menuPosition?.top ?? 8,
          }}
        >
          {stepTypeOrder.map((type) => {
            const meta = nodeMeta[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleInsert(type)}
                className="block w-full px-3 py-2 text-left transition hover:bg-slate-50"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <span className={`h-2 w-2 rounded-full ${meta.accent}`} />
                  {meta.label}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                  {meta.description}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
