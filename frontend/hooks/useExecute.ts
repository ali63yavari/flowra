"use client";

import { useState } from "react";
import { executeIntegration, getJob } from "@/lib/api";

export function useExecute() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [status, setStatus] = useState<string | null>(null);

    const run = async (integrationId: string, input: any) => {
        setLoading(true);
        setResult(null);

        const res = await executeIntegration(integrationId, input);

        const jobId = res.job_id;
        setStatus("queued");

        // polling loop
        const interval = setInterval(async () => {
            const job = await getJob(jobId);

            setStatus(job.status);

            if (job.status === "success" || job.status === "failed") {
                clearInterval(interval);
                setLoading(false);
                setResult(job.output || job.error);
            }
        }, 1500);
    };

    return { run, loading, result, status };
}