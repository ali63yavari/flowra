"use client";

import ReactFlow, {
    Background,
    Controls,
    Node,
    Edge,
    addEdge,
    Connection,
} from "reactflow";
import "reactflow/dist/style.css";

import { useWorkflowStore } from "@/store/workflowStore";

export default function WorkflowCanvas() {
    const steps = useWorkflowStore((s) => s.workflow.steps);
    const edgesState = useWorkflowStore((s) => s.edges);

    const selectStep = useWorkflowStore((s) => s.selectStep);
    const addStep = useWorkflowStore((s) => s.addStep);
    const connectSteps = useWorkflowStore((s) => s.connectSteps);

    const nodes: Node[] = steps.map((step, i) => ({
        id: step.id,
        position: { x: 100, y: i * 120 },
        data: { label: step.type },
    }));

    const edges: Edge[] = edgesState.map((e) => ({
        ...e,
        label: e.type === "true" ? "✔" : e.type === "false" ? "✖" : "",
    }));

    const onConnect = (connection: Connection) => {
        const stepsMap = Object.fromEntries(
            steps.map((s) => [s.id, s])
        );

        const onConnect = (c: Connection) => {
            if (!c.source || !c.target) return;

            const sourceStep = stepsMap[c.source];

            let edgeType: "true" | "false" | undefined;

            if (sourceStep?.type === "condition") {
                const choice = prompt("Edge type? (true / false)");
                if (choice === "true" || choice === "false") {
                    edgeType = choice;
                } else {
                    alert("Invalid type. Use true or false.");
                    return;
                }
            }

            connectSteps(c.source, c.target, edgeType);
        };
    };

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
                onConnect={onConnect}
                fitView
            >
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    );
}