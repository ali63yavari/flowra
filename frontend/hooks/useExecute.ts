"use client";

import { useState } from "react";
import { executeDirect } from "@/lib/api";
import { useWorkflowStore } from "@/store/workflowStore";

export function useExecute() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const buildDSL = useWorkflowStore((s) => s.buildDSL);
    const validate = useWorkflowStore((s) => s.validate);
    const errors = useWorkflowStore((s) => s.errors);

    const run = async (input: any) => {
        validate();
        if (errors.length) {
            setError("Fix validation errors before running.");
            return;
        }

        setLoading(true);
        setResult(null);
        setError(null);

        try {
            const workflow = buildDSL();
            const res = await executeDirect(workflow, input);

            if (res.status === "error") setError(res.error);
            else setResult(res.data);
        } catch (e: any) {
            setError(e.message);
        }

        setLoading(false);
    };

    return { run, loading, result, error };
}