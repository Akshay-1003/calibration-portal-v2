"use client";

import React, { useEffect, useCallback, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { LinkedGaugesTable } from "../../../components/Tables/LinkedGaugesTable";
import { useInwardGaugeStore } from "../../../store/inwardGaugeStore";
import { TablePageWrapper } from "../../../components/layout/TablePageWrapper";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { CertificatePreviewModal } from "../../../components/certificate/CertificatePreviewModal";
import { PageTitle } from "../../../components/PageTitle";
import { LinkedGauge } from "../../../types";
import { useInwardEntryDetails } from "../../../hooks/useInwardEntryDetails";
import { Badge } from "../../../components/ui/badge";
import { Skeleton } from "@heroui/react";
import { useOptimizedNavigation } from "../../../hooks/useOptimizedNavigation";
import { isCacheEntryValid } from "../../../utils/cacheManager";
import { useShallow } from "zustand/react/shallow";
import { useNavigation } from "../../../context/NavigationContext";

const CalibrationPage = React.memo(() => {
  const navigate = useNavigate();
  const { inwardId } = useParams<{ inwardId: string }>();
  const { navigateToDetail, isReturning, clearNavigationState } = useOptimizedNavigation();
  const { startLoading } = useNavigation();

  const {
    allInwardedgauges,
    fetchAllCurrentInwardedGauges,
    loadingCalibrationList,
    calibrationListByInwardId,
    lastFetchCalibrationListByInwardId,
    cacheDuration,
  } = useInwardGaugeStore(
    useShallow((state) => ({
      allInwardedgauges: state.allInwardedgauges,
      fetchAllCurrentInwardedGauges: state.fetchAllCurrentInwardedGauges,
      loadingCalibrationList: state.loading.loadingCalibrationList,
      calibrationListByInwardId: state.calibrationListByInwardId,
      lastFetchCalibrationListByInwardId: state.lastFetchCalibrationListByInwardId,
      cacheDuration: state.cacheDuration,
    }))
  );

  // Get inward entry details for title
  const { client_org_name, inward_no, inward_date ,loading: loadingInwardEntryDetails} = useInwardEntryDetails(inwardId);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedCertificateId, setSelectedCertificateId] = useState<string | undefined>();
  const [selectedCertificateFileName, setSelectedCertificateFileName] = useState("certificate");

  /* ---------------- Fetch Gauges ---------------- */
  useEffect(() => {
    if (!inwardId) {
      toast.error("No inward ID provided");
      startLoading("/transactions/calibration/inwards");
      navigate("/transactions/calibration/inwards");
      return;
    }

    const loadGauges = async () => {
      try {
        // Skip fetching if we're returning from gauge page and have valid cache
        if (isReturning()) {
          const cached = calibrationListByInwardId[inwardId];
          const cacheTimestamp = lastFetchCalibrationListByInwardId[inwardId];
          
          if (cached && isCacheEntryValid(cacheTimestamp ?? null, cacheDuration)) {
            // Use cached data instead of re-fetching
            clearNavigationState();
            return;
          }
        }
        
        // Always fetch to ensure fresh data - cache is handled by store internally
        await fetchAllCurrentInwardedGauges(inwardId);
        clearNavigationState();
      } catch (error) {
        console.error("Error loading gauges:", error);
        toast.error("Failed to load gauges for this inward entry");
      }
    };

    void loadGauges();
  }, [
    inwardId,
    fetchAllCurrentInwardedGauges,
    navigate,
    startLoading,
    isReturning,
    clearNavigationState,
  ]);

  /* ---------------- Handlers ---------------- */
  const handleBackToList = useCallback(() => {
    startLoading("/transactions/calibration/inwards");
    navigate("/transactions/calibration/inwards");
  }, [navigate, startLoading]);

  const handleNablCalibration = useCallback(
    (gauge: LinkedGauge) => {
      const currentPath = `/transactions/calibration-certificate/${inwardId}`;
      const detailPath = `/transactions/calibration-certificate/nabl-process/${gauge.inward_id}/${gauge.gauge_id}`;
      
      navigateToDetail(detailPath, currentPath);
    },
    [navigateToDetail, inwardId]
  );

  const handleNonNablCalibration = useCallback(() => {
    toast.info("Non-NABL calibration coming soon!");
  }, []);

  const handleEditGauge = useCallback(
    (gaugeId: string) => {
      if (!inwardId) {
        toast.error("Inward ID is missing");
        return;
      }

      const gauge = allInwardedgauges.find((g) => g.gauge_id === gaugeId || g.id === gaugeId);
      if (!gauge) {
        toast.error("Gauge not found");
        return;
      }
      
      const currentPath = `/transactions/calibration-certificate/${inwardId}`;
      const detailPath = `/transactions/calibration-certificate/nabl-process/${gauge.inward_id || inwardId}/${gauge.gauge_id || gaugeId}`;
      
      navigateToDetail(detailPath, currentPath, { isEdit: true });
    },
    [navigateToDetail, inwardId, allInwardedgauges]
  );

  const handleClosePreview = useCallback(() => {
    setPreviewModalOpen(false);
    setSelectedCertificateId(undefined);
    setSelectedCertificateFileName("certificate");
  }, []);

  const handlePreviewGauge = useCallback((certificateId: string) => {
    setSelectedCertificateId(certificateId);
    const gauge = allInwardedgauges.find((item) => item.certificate_id === certificateId);
    if (gauge) {
      setSelectedCertificateFileName(
        `${gauge.master_gauge_name || "Gauge"}_${gauge.inward_gauge_lab_id || "Lab"}`
      );
    }
    setPreviewModalOpen(true);
  }, [allInwardedgauges]);

  // Format title with company name and inward number
  // Using clientDcNo if available, otherwise use inwardNo (id)
  const pageTitle = useMemo(() => {
    const displayInwardNo = inward_no;

    if (client_org_name && displayInwardNo) {
      return `Calibration - ${client_org_name} (Inward #${displayInwardNo})`;
    }
    if (client_org_name) {
      return `Calibration - ${client_org_name}`;
    }
    if (displayInwardNo) {
      return `Calibration - Inward #${displayInwardNo}`;
    }
    return "Calibration - Gauges";
  }, [client_org_name, inward_no]);

  // Format description with inward date


  /* ---------------- Render ---------------- */
  return (
    <>
      <PageTitle title={pageTitle} />

      <TablePageWrapper
        title={loadingInwardEntryDetails ?  <div className="max-w-[300px] w-full flex items-center gap-3">
          <div>
            <Skeleton className="flex rounded-full w-12 h-12" />
          </div>
          <div className="w-full flex flex-col gap-2">
            <Skeleton className="h-3 w-3/5 rounded-lg" />
            <Skeleton className="h-3 w-4/5 rounded-lg" />
          </div>
        </div> : <>
          <h1 className="text-lg font-semibold mb-1">Clinet Name: {client_org_name ?? "N/A"}</h1>
          <span className="text-gray-700 text-base font-md"> Inward No.: <Badge className="bg-blue-100 text-blue-700 text-md">{inward_no ?? "N/A"}</Badge> </span>
          <span className="text-gray-700 text-base font-md"> Inward Date: <Badge className="bg-blue-100 text-blue-700 text-md">{inward_date ?? "N/A" }</Badge> </span>

        </>}

        actions={
          <Button
            variant="outline"
            onClick={handleBackToList}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Inward Entries
          </Button>
        }
      >
        <div className="w-full p-2">
          <LinkedGaugesTable
            data={allInwardedgauges}
            loading={loadingCalibrationList}
            onEdit={handleEditGauge}
            onDelete={() => { }}
            onPreview={handlePreviewGauge}
            isPreview
            onNablCalibration={handleNablCalibration}
            onNonNablCalibration={handleNonNablCalibration}
          />
        </div>

        {/* Certificate Preview Modal */}
        <CertificatePreviewModal
          isOpen={previewModalOpen}
          onClose={handleClosePreview}
          certificateUrl={selectedCertificateId ?? null}
          fileName={selectedCertificateFileName}
        />
      </TablePageWrapper>
    </>
  );
});

export default CalibrationPage;
