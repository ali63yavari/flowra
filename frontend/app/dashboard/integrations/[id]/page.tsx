"use client";

import WorkflowCanvas from "@/components/workflow/WorkflowCanvas";
import NodeEditor from "@/components/workflow/NodeEditor";

export default function BuilderPage() {
    return (
        <div style={{ display: "flex", gap: 20 }}>
            <div style={{ flex: 2 }}>
                <WorkflowCanvas />
            </div>

            <div style={{ flex: 1 }}>
                <NodeEditor />
            </div>
        </div>
    );
}