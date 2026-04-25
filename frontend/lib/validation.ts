export interface Edge {
    id: string;
    source: string;
    target: string;
}

export interface ValidationError {
    type: "node" | "edge" | "graph";
    id?: string; // nodeId or edgeId
    message: string;
}

export function validateGraph(
    steps: { id: string }[],
    edges: Edge[]
): ValidationError[] {
    const errors: ValidationError[] = [];

    const incoming: Record<string, number> = {};
    const outgoing: Record<string, number> = {};
    const adj: Record<string, string[]> = {};

    steps.forEach((s) => {
        incoming[s.id] = 0;
        outgoing[s.id] = 0;
        adj[s.id] = [];
    });

    edges.forEach((e) => {
        if (!incoming[e.target] && incoming[e.target] !== 0) return;
        incoming[e.target]++;
        outgoing[e.source]++;
        adj[e.source].push(e.target);
    });

    // Rule 1: exactly one start node
    const startNodes = steps.filter((s) => incoming[s.id] === 0);
    if (startNodes.length === 0) {
        errors.push({
            type: "graph",
            message: "No start node (node with no incoming edges).",
        });
    }
    if (startNodes.length > 1) {
        errors.push({
            type: "graph",
            message: "Multiple start nodes detected.",
        });
    }

    // Rule 2: at most one outgoing edge
    Object.entries(outgoing).forEach(([id, count]) => {
        if (count > 1) {
            errors.push({
                type: "node",
                id,
                message: "Node has multiple outgoing edges.",
            });
        }
    });

    // Rule 3: cycle detection (DFS)
    const visited: Record<string, number> = {}; // 0=unvisited,1=visiting,2=done

    function dfs(node: string): boolean {
        if (visited[node] === 1) return true; // cycle
        if (visited[node] === 2) return false;

        visited[node] = 1;
        for (const n of adj[node]) {
            if (dfs(n)) return true;
        }
        visited[node] = 2;
        return false;
    }

    for (const s of steps) {
        if (!visited[s.id]) {
            if (dfs(s.id)) {
                errors.push({
                    type: "graph",
                    message: "Cycle detected in workflow.",
                });
                break;
            }
        }
    }

    // Rule 4: reachability
    if (startNodes.length === 1) {
        const reachable = new Set<string>();
        const stack = [startNodes[0].id];

        while (stack.length) {
            const cur = stack.pop()!;
            if (reachable.has(cur)) continue;
            reachable.add(cur);
            adj[cur].forEach((n) => stack.push(n));
        }

        steps.forEach((s) => {
            if (!reachable.has(s.id)) {
                errors.push({
                    type: "node",
                    id: s.id,
                    message: "Node is not connected to workflow.",
                });
            }
        });
    }

    return errors;
}