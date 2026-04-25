"use client";

import { useExecute } from "@/hooks/useExecute";

export default function RunPanel() {
    const { run, loading, result, error } = useExecute();

    const handleRun = async () => {
        await run({
            email: "test@test.com",
            password: "123456",
        });
    };

    return (
        <div style={{ marginTop: 20 }}>
            <button onClick={handleRun} disabled={loading}>
                {loading ? "Running..." : "Run Workflow"}
            </button>

            {error && (
                <div style={{ color: "red", marginTop: 10 }}>
                    Error: {error}
                </div>
            )}

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