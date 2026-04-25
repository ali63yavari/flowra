"use client";

import { useExecute } from "@/hooks/useExecute";

export default function RunPanel() {
    const { run, loading, result, status } = useExecute();

    const handleRun = async () => {
        // temporary static input
        await run("123", {
            email: "test@test.com",
            password: "123456",
        });
    };

    return (
        <div style={{ marginTop: 20 }}>
            <button onClick={handleRun} disabled={loading}>
                {loading ? "Running..." : "Run Workflow"}
            </button>

            {status && <p>Status: {status}</p>}

            {result && (
                <pre
                    style={{
                        marginTop: 10,
                        background: "#111",
                        color: "#0f0",
                        padding: 10,
                    }}
                >
          {JSON.stringify(result, null, 2)}
        </pre>
            )}
        </div>
    );
}