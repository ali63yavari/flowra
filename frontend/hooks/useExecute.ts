import { useState } from "react";
import { executeIntegration } from "@/lib/api";

export function useExecute() {
  const [loading, setLoading] = useState(false);

  const run = async (id: string, input: any) => {
    setLoading(true);
    const res = await executeIntegration(id, input);
    setLoading(false);
    return res;
  };

  return { run, loading };
}
