"use client";

import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";

import { mapStepsToGraph } from "@/lib/graphMapper";
import { useWorkflowStore } from "@/store/workflowStore";

export default function WorkflowCanvas() {
  const steps = useWorkflowStore((s) => s.workflow.steps);
  const branchTargets = useWorkflowStore((s) => s.branchTargets);
  const selectedStepId = useWorkflowStore((s) => s.selectedStepId);
  const selectStep = useWorkflowStore((s) => s.selectStep);
  const execution = useWorkflowStore((s) => s.execution);
  const errors = useWorkflowStore((s) => s.errors);

  const { nodes, edges } = mapStepsToGraph(steps, branchTargets, {
    selectedStepId,
    failedStepId: execution.failedStepId,
    errors,
  });

  return (
    <section className="rounded border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Graph preview</p>
        <h2 className="mt-1 text-sm font-semibold text-slate-950">Read-only projection</h2>
      </div>
      <div className="h-[640px] min-h-0">
        {steps.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Add a step to see the graph.
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            onNodeClick={(_, node) => selectStep(node.id)}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>
    </section>
  );
}
