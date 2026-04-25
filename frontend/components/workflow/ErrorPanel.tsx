"use client";

import { useWorkflowStore } from "@/store/workflowStore";

export default function ErrorPanel() {
    const errors = useWorkflowStore((s) => s.errors);

    if (!errors.length) return null;

    return (
        <div style={{ marginTop: 10, color: "red" }}>
            <h4>Validation Errors</h4>
            {errors.map((e, i) => (
                <div key={i}>• {e.message}</div>
            ))}
        </div>
    );
}