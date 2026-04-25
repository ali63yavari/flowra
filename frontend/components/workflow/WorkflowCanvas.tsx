"use client";

import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";

import { useWorkflowStore } from "@/store/workflowStore";

export default function WorkflowCanvas() {
    const steps = useWorkflowStore((s) => s.workflow.steps);

    const nodes = steps.map((step, i) => ({
        id: step.id,
        position: { x: 100, y: i * 120 },
        data: { label: step.type },
    }));

    const edges = steps
        .filter((s) => s.next)
        .map((s) => ({
            id: `${s.id}-${s.next}`,
            source: s.id,
            target: s.next!,
        }));

    return (
        <div style={{ width: "100%", height: "600px" }}>
            <ReactFlow nodes={nodes} edges={edges}>
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    );
}