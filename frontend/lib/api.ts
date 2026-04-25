const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function executeDirect(
    workflow: any,
    input: any
) {
    const res = await fetch(`${BASE_URL}/execute-direct`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": process.env.NEXT_PUBLIC_API_KEY!,
        },
        body: JSON.stringify({
            workflow,
            input,
        }),
    });

    return res.json();
}