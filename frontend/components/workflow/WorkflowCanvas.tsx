"use client";

import ReactFlow, {
    Background,
    Controls,
    Node,
    Edge,
    Connection,
} from "reactflow";
import "reactflow/dist/style.css";

import { useWorkflowStore } from "@/store/workflowStore";

export default function WorkflowCanvas() {
    const steps = useWorkflowStore((s) => s.workflow.steps);
    const edgesState = useWorkflowStore((s) => s.edges);
    const errors = useWorkflowStore((s) => s.errors);

    const selectStep = useWorkflowStore((s) => s.selectStep);
    const connectSteps = useWorkflowStore((s) => s.connectSteps);

    const errorNodeIds = new Set(
        errors.filter((e) => e.type === "node").map((e) => e.id)
    );

    const nodes: Node[] = steps.map((step, i) => ({
        id: step.id,
        position: { x: 100, y: i * 120 },
        data: { label: step.type },
        style: errorNodeIds.has(step.id)
            ? { border: "2px solid red" }
            : {},
    }));

    const edges: Edge[] = edgesState.map((e) => ({
        ...e,
        style: errors.some(
            (err) => err.type === "edge" && err.id === e.id
        )
            ? { stroke: "red" }
            : {},
    }));

    const onConnect = (c: Connection) => {
        if (!c.source || !c.target) return;

        const ok = connectSteps(c.source, c.target);
        if (!ok) alert("Only one outgoing edge allowed.");
    };

    return (
        <div style={{ width: "100%", height: "600px" }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodeClick={(_, node) => selectStep(node.id)}
                onConnect={onConnect}
                fitView
            >
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    );
}