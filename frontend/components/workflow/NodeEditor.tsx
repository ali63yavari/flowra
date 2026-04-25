"use client";

import { useWorkflowStore } from "@/store/workflowStore";

export default function NodeEditor() {
    const { workflow, selectedStepId, updateStep } = useWorkflowStore();

    const step = workflow.steps.find((s) => s.id === selectedStepId);
    if (!step) return <div>Select a node</div>;

    return (
        <div>
            <h3>Edit Step: {step.type}</h3>

            <textarea
                value={JSON.stringify(step.config, null, 2)}
                onChange={(e) =>
                    updateStep(step.id, {
                        config: JSON.parse(e.target.value),
                    })
                }
                style={{ width: "100%", height: 200 }}
            />
        </div>
    );
}