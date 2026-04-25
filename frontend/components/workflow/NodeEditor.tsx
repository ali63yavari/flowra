"use client";

import { useWorkflowStore } from "@/store/workflowStore";
import { useState } from "react";

export default function NodeEditor() {
    const { workflow, selectedStepId, updateStep } = useWorkflowStore();
    const [error, setError] = useState<string | null>(null);

    const step = workflow.steps.find((s) => s.id === selectedStepId);
    if (!step) return <div>Select a node</div>;

    return (
        <div>
            <h3>Edit Step: {step.type}</h3>

            <textarea
                value={JSON.stringify(step.config, null, 2)}
                onChange={(e) => {
                    try {
                        const parsed = JSON.parse(e.target.value);
                        updateStep(step.id, { config: parsed });
                        setError(null);
                    } catch {
                        setError("Invalid JSON");
                    }
                }}
                style={{ width: "100%", height: 200 }}
            />

            {error && <div style={{ color: "red" }}>{error}</div>}
        </div>
    );
}