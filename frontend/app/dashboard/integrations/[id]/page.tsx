"use client";

import WorkflowCanvas from "@/components/workflow/WorkflowCanvas";
import NodeEditor from "@/components/workflow/NodeEditor";
import RunPanel from "@/components/workflow/RunPanel";
import NodePalette from "@/components/workflow/NodePalette";

export default function BuilderPage() {
    return (
        <div style={{ display: "flex", height: "100vh" }}>

            <NodePalette />

            <div style={{ flex: 1, padding: 20 }}>
                <WorkflowCanvas />
                <RunPanel />
            </div>

            <div style={{ width: 300, borderLeft: "1px solid #333" }}>
                <NodeEditor />
            </div>
        </div>
    );
}