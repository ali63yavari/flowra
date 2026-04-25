"use client";

import { useEffect } from "react";
import WorkflowCanvas from "@/components/workflow/WorkflowCanvas";
import NodeEditor from "@/components/workflow/NodeEditor";
import { useWorkflowStore } from "@/store/workflowStore";

export default function BuilderPage() {
    const addStep = useWorkflowStore((s) => s.addStep);

    useEffect(() => {
        addStep({
            id: "step-1",
            type: "http_request",
            config: {
                method: "GET",
                url: "https://example.com",
            },
            next: "",
        });
    }, []);

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