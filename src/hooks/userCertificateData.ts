// hooks/useCertificateGauge.ts
import { useEffect } from "react";
import { useInwardGaugeStore } from "../store/inwardGaugeStore";
import { toast } from "sonner";
import { Specifications, Observations } from "../types/index";

export function useCertificateGauge(inwardId?: string, gaugeId?: string) {
    const {
        currentInwardGauges: gaugeData,
        loading,
        FetchInwardedGaugeByGaugeIdAndInwardId,
        isCompositeCacheValid,
    } = useInwardGaugeStore();

    useEffect(() => {
        if (!inwardId || !gaugeId) return;
        console.log('gaugeData before', gaugeData?.observations);

        const shouldForceFetch = !isCompositeCacheValid(inwardId, gaugeId);

        FetchInwardedGaugeByGaugeIdAndInwardId(inwardId, gaugeId, shouldForceFetch)
            .catch(() => toast.error("Failed to load gauge data"));
    }, [inwardId, gaugeId]);

    console.log('gaugeData after', gaugeData?.observations);
    return {
        observations: gaugeData?.observations || {} as Observations,
        specifications: gaugeData?.specifications || {} as Specifications,
        gaugeData,
        loading
    };
}
