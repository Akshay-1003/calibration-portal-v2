import { useEffect, useState } from "react";
import { apiClient } from "../services/api";
import { ThreadRingPlugApiResponse } from "../store/threadRingPlugStore";

export function useThreadRingPlug(standardSpecification?: string) {
  const [data, setData] = useState<ThreadRingPlugApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!standardSpecification) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    apiClient
      .get<ThreadRingPlugApiResponse>(
        `/plain-thread/specifications/${standardSpecification}`,
        {
          signal: controller.signal,
        }
      )
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        if (err.name === "CanceledError") return; // ✅ ignore StrictMode abort
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [standardSpecification]);

  return { data, loading, error };
}

