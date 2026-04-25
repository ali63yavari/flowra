"use client";

const nodeTypes = [
    { type: "http_request", label: "HTTP Request" },
    { type: "form_submit", label: "Form Submit" },
    { type: "extract", label: "Extract Data" },
    { type: "browser", label: "Browser Step" },
];

export default function NodePalette() {
    const onDragStart = (event: React.DragEvent, type: string) => {
        event.dataTransfer.setData("application/flowra-node", type);
        event.dataTransfer.effectAllowed = "move";
    };

    return (
        <div
            style={{
                padding: 10,
                borderRight: "1px solid #333",
                width: 200,
            }}
        >
            <h4>Nodes</h4>

            {nodeTypes.map((node) => (
                <div
                    key={node.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, node.type)}
                    style={{
                        padding: 8,
                        marginBottom: 8,
                        background: "#222",
                        color: "#fff",
                        cursor: "grab",
                    }}
                >
                    {node.label}
                </div>
            ))}
        </div>
    );
}