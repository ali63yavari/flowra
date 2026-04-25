const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function executeIntegration(
    integrationId: string,
    input: any
) {
    const res = await fetch(`${BASE_URL}/execute/${integrationId}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": process.env.NEXT_PUBLIC_API_KEY!,
        },
        body: JSON.stringify(input),
    });

    return res.json();
}

export async function getJob(jobId: string) {
    const res = await fetch(`${BASE_URL}/jobs/${jobId}`);
    return res.json();
}