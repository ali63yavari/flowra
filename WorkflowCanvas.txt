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

    const selectedStepId = useWorkflowStore((s) => s.selectedStepId);
    const selectStep = useWorkflowStore((s) => s.selectStep);
    const connectSteps = useWorkflowStore((s) => s.connectSteps);
    const updatePosition = useWorkflowStore((s) => s.updatePosition);
    const deleteStep = useWorkflowStore((s) => s.deleteStep);
    const deleteEdge = useWorkflowStore((s) => s.deleteEdge);
    const addStep = useWorkflowStore((s) => s.addStep); // 🔥 IMPORTANT

    // ✅ nodes
    const nodes: Node[] = steps.map((step) => ({
        id: step.id,
        position: step.position,
        data: { label: step.type },
        selectable: true,
        draggable: true,
        selected: step.id === selectedStepId,
        style: {
            background: "#1f2937",
            color: "#fff",
            padding: 10,
            borderRadius: 6,
        },
    }));

    // ✅ edges
    const edges: Edge[] = edgesState.map((e) => ({
        ...e,
        label: e.type === "true" ? "✔" : e.type === "false" ? "✖" : "",
    }));

    // ✅ connect nodes
    const onConnect = (c: Connection) => {
        if (!c.source || !c.target) return;
        connectSteps(c.source, c.target);
    };

    // ✅ persist drag position
    const onNodeDragStop = (_: any, node: Node) => {
        updatePosition(node.id, node.position);
        selectStep(node.id);
    };

    // ✅ node deletion
    const onNodesChange = (changes: any[]) => {
        changes.forEach((c) => {
            if (c.type === "remove") {
                deleteStep(c.id);
            }
        });
    };

    // ✅ edge deletion
    const onEdgesChange = (changes: any[]) => {
        changes.forEach((c) => {
            if (c.type === "remove") {
                deleteEdge(c.id);
            }
        });
    };

    // 🔥 DROP HANDLER (THIS WAS MISSING)
    const onDrop = (event: React.DragEvent) => {
        event.preventDefault();

        const type = event.dataTransfer.getData("application/flowra-node");

        if (!type) return;

        const bounds = event.currentTarget.getBoundingClientRect();

        const position = {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
        };

        const newId = addStep(type, position);
        selectStep(newId);
    };

    // 🔥 REQUIRED FOR DROP TO WORK
    const onDragOver = (event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    };

    return (
        <div
            style={{ width: "100%", height: "600px" }}
            onDrop={onDrop}
            onDragOver={onDragOver}
            tabIndex={0} // keep for keyboard delete
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                selectNodesOnDrag={false}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={(_, node) => selectStep(node.id)}
                onConnect={onConnect}
                onNodeDragStop={onNodeDragStop}
                deleteKeyCode={["Backspace", "Delete"]}
                fitView
            >
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    );
}