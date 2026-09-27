import { useEffect, useState } from "react";
import { fetchTaperThreadReading } from "../services/apiServices";
import { TaperThreadReadingsApiResponse } from "../store/taperThreadReadingsStore";

export function useTaperThreadReading(standardSpecification?: string) {
  const [data, setData] = useState<TaperThreadReadingsApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!standardSpecification) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchTaperThreadReading(standardSpecification)
      .then((res) => {
        if (controller.signal.aborted) return;
        setData(res);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err.name === "CanceledError" || err.name === "AbortError") return;
        setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [standardSpecification]);

  return { data, loading, error };
}

