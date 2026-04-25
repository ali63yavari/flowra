"use client";

import ReactFlow, {
    Background,
    Controls,
    Node,
    Edge,
} from "reactflow";
import "reactflow/dist/style.css";

import { useWorkflowStore } from "@/store/workflowStore";

export default function WorkflowCanvas() {
    const steps = useWorkflowStore((s) => s.workflow.steps);
    const selectStep = useWorkflowStore((s) => s.selectStep);
    const addStep = useWorkflowStore((s) => s.addStep);

    const nodes: Node[] = steps.map((step, i) => ({
        id: step.id,
        position: { x: 100, y: i * 120 },
        data: { label: step.type },
    }));

    const edges: Edge[] = steps
        .filter((s) => s.next)
        .map((s) => ({
            id: `${s.id}-${s.next}`,
            source: s.id,
            target: s.next!,
        }));

    const onDrop = (event: React.DragEvent) => {
        event.preventDefault();

        const type = event.dataTransfer.getData("application/flowra-node");

        const position = {
            x: event.clientX - 200,
            y: event.clientY,
        };

        addStep(type, position);
    };

    const onDragOver = (event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    };

    return (
        <div
            style={{ width: "100%", height: "600px" }}
            onDrop={onDrop}
            onDragOver={onDragOver}
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodeClick={(_, node) => selectStep(node.id)}
            >
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    );
}