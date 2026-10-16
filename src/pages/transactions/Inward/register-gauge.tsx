import { useParams, useNavigate } from "react-router-dom";
import { lazy, Suspense, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useInwardGaugeStore } from "../../../store/inwardGaugeStore";
import { InwardGaugeForm, type InwardGaugeFormRef } from "../../../components/form/InwardGaugeForm";
import { PageContainer } from "../../../components/layout/PageContainer";
import { toast } from "sonner";
import { GaugeData as ExistingGaugeType } from "../../../types/types";
import {
  Modal,
  Button,
  Tabs,
  Card,
} from "@heroui/react";
import { useMasterDataStore } from "../../../store/useStore";
import { type GaugeRegistrationFormData } from "../../../lib/validations";
import type { StickerPrintData } from "../../../utils/stickerPrint";
import { apiClient } from "../../../services/api";
import { StickerSettingsSimpleModal, type SimpleStickerSettings } from "../../../components/sticker/StickerSettingsSimpleModal";
import { convertFormSpecifications } from "../../../utils/specificationConverter";
import {
  getLegacySpecificationText,
  normalizeGaugeSpecifications,
} from "../../../utils/legacyGaugeSpecifications";
import { useGaugeMastersWithQuery } from "../../../hooks/useGaugeMastersWithQuery";
import { useCertificateTypesWithQuery } from "../../../hooks/useCertificateTypesWithQuery";
import { useDebounce } from "../../../hooks/useDebounce";

type GaugeFlowType = "calibration" | "data_save";
type PrefilledGaugeSource = "existing" | "data_save";
type CalibrationLocationType = "permanent_facility" | "site_facility" | "mobile_facility";

const normalizeCalibrationLocation = (value: unknown): CalibrationLocationType => {
  if (value === "site_facility" || value === "customer_site") return "site_facility";
  if (value === "mobile_facility") return "mobile_facility";
  return "permanent_facility";
};

const useDisclosure = () => {
  const [isOpen, setIsOpen] = useState(false);
  return {
    isOpen,
    onOpen: () => setIsOpen(true),
    onClose: () => setIsOpen(false),
    onOpenChange: setIsOpen,
  };
};

const ExistingGaugesTable = lazy(() =>
  import("../../../components/Tables/ExistingGaugesTable").then((module) => ({
    default: module.ExistingGaugesTable,
  })),
);

const DataSaveGaugesTable = lazy(() =>
  import("../../../components/Tables/DataSaveGaugesTable").then((module) => ({
    default: module.DataSaveGaugesTable,
  })),
);

const InwardLinkedGaugesTable = lazy(() =>
  import("../../../components/Tables/InwardLinkedGaugesTable").then((module) => ({
    default: module.InwardLinkedGaugesTable,
  })),
);

function TableSectionFallback() {
  return (
    <div className="space-y-3 p-4 animate-pulse">
      <div className="h-10 rounded-lg bg-gray-100" />
      <div className="h-10 rounded-lg bg-gray-100" />
      <div className="h-10 rounded-lg bg-gray-100" />
      <div className="h-10 rounded-lg bg-gray-100" />
    </div>
  );
}

const HANDLED_GAUGE_SAVE_ERROR = "__GAUGE_SAVE_ERROR_HANDLED__";


export default function RegisterGaugePage() {
  const { inwardId, clientId, inward_no,clientName, inwardDate } = useParams();
  const navigate = useNavigate();
  const backTo =  "/transactions/inward";
  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure();

  const {
    currentInwardPendingById,
    currentInwardPendingMetaById,
    dataSaveListByInwardId,
    clearError,
    fetchAllCurrentPendingInwardedGauges,
    fetchAllCurrentInwardDataSaves,
    addInwardGaugeToState,
    mapGaugeToInwardState,
    loading,
    error,
    updateInwardGaugeInState,
    deleteInwardGaugeFromState,
    deleteInwardDataSaveFromState,
    fetchInwardGaugeRecord,
  } = useInwardGaugeStore();
  const {
    existingGauges,
    existingGaugeLoading,
    existingGaugesPagination,
    fetchExistingGauges,
  } = useMasterDataStore();
  const {
    gaugeMasterList,
    loading: gaugeMasterLoading,
  } = useGaugeMastersWithQuery();
  const {
    certificateTypes,
    loading: certificateTypeLoading,
  } = useCertificateTypesWithQuery();

  const dataSaveGauges = useMemo(
    () =>
      (inwardId ? dataSaveListByInwardId[inwardId] ?? [] : []).map((gauge) => {
        const gaugeWithMeta = gauge as ExistingGaugeType & {
          gauge_id?: string;
          master_gauge_id?: string;
          certificate_type_id?: string;
          master_gauge_name?: string;
          gaugeInfo?: {
            gauge_id?: string;
            master_gauge_name?: string;
          };
        };
        const masterGaugeName =
          gaugeWithMeta.master_gauge ||
          gaugeWithMeta.master_gauge_name ||
          gaugeWithMeta.gaugeInfo?.master_gauge_name ||
          "";
        const matchedGaugeMaster = gaugeMasterList.find(
          (item) =>
            item.id === gaugeWithMeta.master_gauge_id ||
            item.name.toLowerCase() === masterGaugeName.toLowerCase()
        );

        return {
          ...gaugeWithMeta,
          id: gaugeWithMeta.gauge_id || gaugeWithMeta.gaugeInfo?.gauge_id || gaugeWithMeta.id,
          master_gauge_id: gaugeWithMeta.master_gauge_id || matchedGaugeMaster?.id || "",
          certificate_type_id:
            gaugeWithMeta.certificate_type_id || matchedGaugeMaster?.certificate_type_id || "",
          master_gauge: masterGaugeName,
        };
      }),
    [dataSaveListByInwardId, gaugeMasterList, inwardId]
  );

  const nonDataSaveExistingGauges = useMemo(
    () => existingGauges.filter((gauge) => (gauge as { process?: string }).process !== "data_save"),
    [existingGauges]
  );

  const [selectedKey, setSelectedKey] = useState<"addNewGauge" | "addExistingGauges" | "addDataSaveGauges">("addNewGauge");
  const [isEditing, setIsEditing] = useState(false);
  const [editingFlowType, setEditingFlowType] = useState<GaugeFlowType>("calibration");
  const [editingGaugeId, setEditingGaugeId] = useState<string | null>(null);
  const [gaugeIdToDelete, setGaugeIdToDelete] = useState<string | null>(null);
  const [deleteFlowType, setDeleteFlowType] = useState<GaugeFlowType>("calibration");
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [bulkAddLoading, setBulkAddLoading] = useState(false);
  const [editingFormData, setEditingFormData] = useState<Partial<GaugeRegistrationFormData> | undefined>(undefined);
  const [legacySpecification, setLegacySpecification] = useState<string | null>(null);
  const [savedFormData, setSavedFormData] = useState<Partial<GaugeRegistrationFormData> | undefined>(undefined);
  const [prefilledGaugeSource, setPrefilledGaugeSource] = useState<{
    gaugeId: string;
    source: PrefilledGaugeSource;
  } | null>(null);
  const [formRenderKey, setFormRenderKey] = useState(0);
  const formRef = useRef<InwardGaugeFormRef>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [foundInExistingGauges, setFoundInExistingGauges] = useState(false);
  const [matchedIdentificationNumber, setMatchedIdentificationNumber] = useState<string>("");
  const [existingGaugePage, setExistingGaugePage] = useState(1);
  const [existingGaugeRowsPerPage, setExistingGaugeRowsPerPage] = useState(10);
  const [linkedGaugePage, setLinkedGaugePage] = useState(1);
  const [linkedGaugeRowsPerPage, setLinkedGaugeRowsPerPage] = useState(10);
  const [linkedGaugeSearch, setLinkedGaugeSearch] = useState("");
  const previousIdentificationNumberRef = useRef<string>("");
  const debouncedLinkedGaugeSearch = useDebounce(linkedGaugeSearch.trim(), 400);
  const mappedGaugeId = prefilledGaugeSource?.gaugeId ?? null;
  const isInwardLinkedGaugesLoading =
    loading.loadingPendingGauges ||
    loading.loadingCalibrationList ||
    loading.loadingCurrentGauge;
  const isDataSaveLoading =
    loading.loadingDataSaveList || loading.loadingCurrentGauge;

  const retryLinkedGauges = useCallback(() => {
    if (!inwardId) return;
    fetchAllCurrentPendingInwardedGauges(
      inwardId,
      true,
      debouncedLinkedGaugeSearch ? { search: debouncedLinkedGaugeSearch } : undefined,
      { page: linkedGaugePage, limit: linkedGaugeRowsPerPage },
    );
  }, [
    debouncedLinkedGaugeSearch,
    fetchAllCurrentPendingInwardedGauges,
    inwardId,
    linkedGaugePage,
    linkedGaugeRowsPerPage,
  ]);
  
  // Sticker printing state
  const {
    isOpen: isStickerSettingsOpen,
    onOpen: onStickerSettingsOpen,
    onClose: onStickerSettingsClose,
  } = useDisclosure();
  const [selectedGaugeIdsForSticker, setSelectedGaugeIdsForSticker] = useState<string[]>([]);
  
  useEffect(() => {
    if (clientId) {
      fetchExistingGauges(clientId, {
        page: existingGaugePage,
        limit: existingGaugeRowsPerPage,
      });
    }
  }, [clientId, existingGaugePage, existingGaugeRowsPerPage, fetchExistingGauges]);

  useEffect(() => {
    if (inwardId) {
      fetchAllCurrentPendingInwardedGauges(
        inwardId,
        false,
        debouncedLinkedGaugeSearch ? { search: debouncedLinkedGaugeSearch } : undefined,
        {
          page: linkedGaugePage,
          limit: linkedGaugeRowsPerPage,
        }
      );
    }
  }, [
    debouncedLinkedGaugeSearch,
    fetchAllCurrentPendingInwardedGauges,
    inwardId,
    linkedGaugePage,
    linkedGaugeRowsPerPage,
  ]);

  useEffect(() => {
    if (inwardId) {
      fetchAllCurrentInwardDataSaves(inwardId);
    }
  }, [fetchAllCurrentInwardDataSaves, inwardId]);

  useEffect(() => {
    setExistingGaugePage(1);
  }, [clientId]);

  useEffect(() => {
    setLinkedGaugePage(1);
  }, [inwardId]);

  useEffect(() => {
    setLinkedGaugePage(1);
  }, [debouncedLinkedGaugeSearch]);

  // Cleanup effect for error clearing
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  // Handle form submission state reset
  useEffect(() => {
    if (formSubmitted) {
      setFormSubmitted(false);
      setIsEditing(false);
    }
  }, [formSubmitted]);

  const resetFormState = useCallback(() => {
    // Clear all form state
    setEditingFormData(undefined);
    setLegacySpecification(null);
    setSavedFormData(undefined);
    setEditingGaugeId(null);
    setIsEditing(false);
    setEditingFlowType("calibration");
    setPrefilledGaugeSource(null);
    setSelectedKey("addNewGauge");
    setFoundInExistingGauges(false);
    setMatchedIdentificationNumber("");
    previousIdentificationNumberRef.current = "";
    // Reset form once - no need for double reset
    formRef.current?.reset();
    // Force unmount/mount cycle to clear nested dynamic components.
    setFormRenderKey((prev) => prev + 1);
  }, []);

  const handleFormClose = useCallback(() => {
    const wasEditing = isEditing;
    resetFormState();
    toast.success(wasEditing ? "❌ Edit mode cancelled" : "Form reset successfully");
  }, [isEditing, resetFormState]);



  // Simple specification conversion - only convert string values to numbers
  const convertSpecifications = useCallback((formData: GaugeRegistrationFormData) => {
    return convertFormSpecifications(formData, certificateTypes, gaugeMasterList);
  }, [certificateTypes, gaugeMasterList]);

  const onSubmit = useCallback(
    async (data: GaugeRegistrationFormData) => {
      setIsSubmitting(true);
      
      try {
        // Extract process from form data (not included in payload)
        const process = data.process;

        // Validate process is selected
        if (!process) {
          toast.error("Please select a process");
          setIsSubmitting(false);
          throw new Error("Process not selected"); // Throw to prevent form reset
        }        
        // Only convert specifications to proper numeric types
        const convertedData = convertSpecifications(data);
        
        // Build the payload with converted specifications
        const selectedGauge = gaugeMasterList.find(
          (gauge) => gauge.id === data.master_gauge_id
        );

        const payload: Record<string, unknown> = {
          client_org_id: clientId ?? "",
          master_gauge_id: data.master_gauge_id,
          gauge_class: data.gauge_class,
          certificate_type_id: selectedGauge?.certificate_type_id || "",
          identification_number: data.identification_number,
          calibration_frequency: Number(data.calibration_frequency) || 0,
          calibration_frequency_unit: data.calibration_frequency_unit,
          make: data.make,
          manf_serial_number: data.manf_serial_number,
          unit: data.unit,
          calibration_location_type: data.calibration_location_type,
          calibration_location: data.calibration_location?.trim() || "",
          calibration_done_under: data.calibration_done_under,
          gauge_condition: data.gauge_condition,
          specifications: convertedData.specifications,
        };

        // Add subtypes if present
        if (convertedData.subtype) {
          payload.subtype = convertedData.subtype;
        }
    
        // Normal inward workflow - requires inwardId
        if (!inwardId) {
          const errorMsg = "Inward ID is required for this process";
          toast.error(errorMsg);
          throw new Error(errorMsg); // Throw to prevent form reset
        }

        const shouldMapExistingGauge = !isEditing && Boolean(mappedGaugeId);

        // Execute API call
        if (isEditing && editingGaugeId) {
          const result = await updateInwardGaugeInState(
            inwardId,
            editingGaugeId,
            payload,
            process === "data_save" || editingFlowType === "data_save" ? "data_save" : "calibration"
          );
          if (!result) {
            // Store already shows the detailed API error toast via runAsync.
            throw new Error(HANDLED_GAUGE_SAVE_ERROR);
          }
          toast.success(process === "data_save" ? "Gauge save updated successfully!" : "Gauge updated successfully!");
        } else if (shouldMapExistingGauge && mappedGaugeId) {
          await apiClient.patch(`/gauge/${mappedGaugeId}`, payload);
          const result = await mapGaugeToInwardState(inwardId, mappedGaugeId, process);
          if (!result) {
            throw new Error(HANDLED_GAUGE_SAVE_ERROR);
          }
          toast.success(
            process === "data_save"
              ? "Gauge mapped to Data Save successfully!"
              : "Existing gauge mapped to inward successfully!"
          );
        } else {
          const result = await addInwardGaugeToState(inwardId, payload, process);
          if (!result) {
            // Store already shows the detailed API error toast via runAsync.
            throw new Error(HANDLED_GAUGE_SAVE_ERROR);
          }
          toast.success(process === "data_save" ? "Gauge saved successfully!" : "Gauge added to inward successfully!");
        }

        // Keep Existing/Data Save tables in sync after save/update.
        if (clientId) {
          await fetchExistingGauges(clientId, {
            page: existingGaugePage,
            limit: existingGaugeRowsPerPage,
            forceRefresh: true,
          });
        }

        if (process === "data_save") {
          await fetchAllCurrentInwardDataSaves(inwardId, true);
        }

        // Reset form state ONLY on success
        resetFormState();
        setFormSubmitted(true);
      } catch (error) {
        // Extract meaningful error message
        const errorMessage = error instanceof Error 
          ? error.message 
          : "Failed to save gauge. Please try again.";
        
        if (errorMessage !== HANDLED_GAUGE_SAVE_ERROR) {
          toast.error(errorMessage);
        }
        
        // Re-throw error to prevent form reset in form component
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      convertSpecifications,
      inwardId,
      isEditing,
      editingGaugeId,
      clientId,
      updateInwardGaugeInState,
      addInwardGaugeToState,
      mapGaugeToInwardState,
      resetFormState,
      fetchExistingGauges,
      fetchAllCurrentInwardDataSaves,
      existingGaugePage,
      existingGaugeRowsPerPage,
      editingFlowType,
      gaugeMasterList,
      mappedGaugeId,
    ]
  );
  const handleEditGauge = useCallback(
    async (gaugeId: string) => {
      try {
        setIsEditing(true);

        const gauge = await fetchInwardGaugeRecord(inwardId ?? "", gaugeId);
        if (!gauge) {
          toast.error("Gauge not found");
          return;
        }
        setPrefilledGaugeSource(null);
        setEditingFlowType("calibration");
        setEditingGaugeId(gauge.id);
        const formData: Partial<GaugeRegistrationFormData> = {
          master_gauge_id: gauge.master_gauge_id || "",
          gauge_class: gauge.gauge_class || "",
          certificate_type_id: gauge.certificate_type_id || "",
          identification_number: gauge.identification_number || "",
          calibration_frequency: gauge.calibration_frequency?.toString() || "",
          calibration_frequency_unit: (gauge.calibration_frequency_unit || "months") as "months" | "years",
          make: gauge.make || "",
          manf_serial_number: gauge.manf_serial_number || "",
          process: "calibration" as const, // Default to calibration when editing
          unit: (gauge.unit || "mm") as "mm" | "inch" | "µm" | "kg/cm2" | "bar" | "Pa" | "degree",
          calibration_location_type: normalizeCalibrationLocation(gauge.calibration_location_type),
          calibration_location: typeof gauge.calibration_location === "string" && !["permanent_facility", "site_facility", "mobile_facility", "customer_site"].includes(gauge.calibration_location) ? gauge.calibration_location : "",
          // calibration_location: gauge.calibration_location || "",
          calibration_done_under: gauge.calibration_done_under === "non_nabl" ? "non_nabl" : "nabl",
          gauge_condition: gauge.gauge_condition || "",
          specifications: normalizeGaugeSpecifications(gauge.specifications),
        };
        setLegacySpecification(getLegacySpecificationText(gauge.specifications));
        setEditingFormData(formData);
        // setActiveTab("new");

        toast.success("✏️ Gauge loaded for editing. Make your changes and click Update.");
      } catch (error) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : "Failed to load gauge for editing";
        toast.error(errorMessage);
      }
    },
    [fetchInwardGaugeRecord, inwardId]
  );


  const handleDeleteGaugeRequest = useCallback(
    (gaugeId: string) => {
      setDeleteFlowType("calibration");
      onOpen();
      setGaugeIdToDelete(gaugeId);
    },
    [onOpen]
  );

  const handleDeleteDataSaveRequest = useCallback(
    (gauge: ExistingGaugeType) => {
      const resolvedGaugeId =
        (gauge as ExistingGaugeType & { gauge_id?: string }).gauge_id || gauge.id;

      if (!resolvedGaugeId) {
        toast.error("Gauge ID not found");
        return;
      }

      setDeleteFlowType("data_save");
      onOpen();
      setGaugeIdToDelete(resolvedGaugeId);
    },
    [onOpen]
  );

  const confirmDeleteGauge = useCallback(async () => {
    if (!gaugeIdToDelete || !inwardId) return

    const result =
      deleteFlowType === "data_save"
        ? await deleteInwardDataSaveFromState(inwardId, gaugeIdToDelete)
        : await deleteInwardGaugeFromState(inwardId, gaugeIdToDelete)

    if (!result) {
      toast.error("❌ Failed to delete gauge. Please try again.")
      return
    }

    toast.success(deleteFlowType === "data_save" ? "🗑️ Data Save deleted successfully!" : "🗑️ Gauge deleted successfully!")
    setGaugeIdToDelete(null)
  }, [deleteFlowType, gaugeIdToDelete, inwardId, deleteInwardDataSaveFromState, deleteInwardGaugeFromState])

  // Handle print sticker button click - open settings modal
  const handlePrintStickerClick = useCallback((gaugeIds: string[]) => {
    if (!gaugeIds || gaugeIds.length === 0) {
      toast.error("No gauges selected for printing");
      return;
    }
    
    setSelectedGaugeIdsForSticker(gaugeIds);
    onStickerSettingsOpen();
  }, [onStickerSettingsOpen]);

  // Handle sticker settings confirm - fetch data and print
  const handleStickerSettingsConfirm = useCallback(async (settings: SimpleStickerSettings) => {
    onStickerSettingsClose();

    if (selectedGaugeIdsForSticker.length === 0) {
      toast.error("No gauges selected for printing");
      return;
    }

    try {
      // Call API to get sticker data
      const response = await apiClient.post<StickerPrintData[]>(
        "/inward-gauges/sticker-data",
        {
          inward_gauge_ids: selectedGaugeIdsForSticker,
        }
      );

      if (!response || !Array.isArray(response) || response.length === 0) {
        toast.error("No sticker data received from API");
        return;
      }

      if (settings.printMethod === "qz") {
        const { printStickersWithQzTray } = await import("../../../utils/stickerQzPrint");
        const result = await printStickersWithQzTray(response, settings);
        toast.success(
          `Sent ${result.stickerCount} sticker(s) to ${result.printerName} through QZ Tray`
        );
      } else {
        // Existing browser/Windows print path. Keep this behavior unchanged.
        const { printStickers } = await import("../../../utils/stickerPrint");
        printStickers(response, settings);
        toast.success(`Opening print window for ${response.length} sticker(s)`);
      }
      
      // Clear state
      setSelectedGaugeIdsForSticker([]);
    } catch (error) {
      console.error("Error preparing sticker data:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to prepare sticker data";
      toast.error(errorMessage);
    }
  }, [selectedGaugeIdsForSticker, onStickerSettingsClose]);


  const handleAddGauge = useCallback(
    (inputGauge: ExistingGaugeType, source: PrefilledGaugeSource) => {
      const matchedGaugeMaster = gaugeMasterList.find(
        (item) =>
          item.id === inputGauge.master_gauge_id ||
          item.name.toLowerCase() === (inputGauge.master_gauge || "").toLowerCase()
      );
      const existingGauge: ExistingGaugeType = {
        ...inputGauge,
        master_gauge_id: inputGauge.master_gauge_id || matchedGaugeMaster?.id || "",
        certificate_type_id:
          inputGauge.certificate_type_id || matchedGaugeMaster?.certificate_type_id || "",
      };
      const formData: Partial<GaugeRegistrationFormData> = {
        master_gauge_id: existingGauge.master_gauge_id || "",
        gauge_class: existingGauge.gauge_class || "",
        certificate_type_id: existingGauge.certificate_type_id || "",
        identification_number: existingGauge.identification_number || "",
        calibration_frequency: existingGauge.calibration_frequency?.toString() || "",
        calibration_frequency_unit: (existingGauge.calibration_frequency_unit || "months") as "months" | "years",
        make: existingGauge.make || "",
        manf_serial_number: existingGauge.manf_serial_number || "",
        process: "calibration" as const,
        unit: (existingGauge.unit || "mm") as "mm" | "inch" | "µm" | "kg/cm2" | "bar" | "Pa" | "degree",
        calibration_location_type: normalizeCalibrationLocation(existingGauge.calibration_location_type),
        calibration_location: typeof existingGauge.calibration_location === "string" && !["permanent_facility", "site_facility", "mobile_facility", "customer_site"].includes(existingGauge.calibration_location) ? existingGauge.calibration_location : "",
        calibration_done_under: (existingGauge.calibration_done_under || "nabl") as "nabl" | "non_nabl",
        gauge_condition: existingGauge.gauge_condition || "",
        specifications: normalizeGaugeSpecifications(existingGauge.specifications),
      };

      setIsEditing(false);
      setEditingFlowType("calibration");
      setEditingGaugeId(null);
      setPrefilledGaugeSource({
        gaugeId: existingGauge.id,
        source,
      });
      setSavedFormData(undefined);
      setEditingFormData(formData);
      setLegacySpecification(getLegacySpecificationText(existingGauge.specifications));
      setSelectedKey("addNewGauge");
      setFormRenderKey((prev) => prev + 1);

      // Clear the matched identification number and search state when adding gauge
      setFoundInExistingGauges(false);
      setMatchedIdentificationNumber("");
      previousIdentificationNumberRef.current = "";

      toast.success(
        `📥 Gauge "${existingGauge.identification_number}" loaded into form.`
      );
    },
    [gaugeMasterList]
  );

  const handleBulkAddExistingGauges = useCallback(
    async (gauges: ExistingGaugeType[]) => {
      if (!inwardId) {
        toast.error("Inward ID is required for bulk add");
        return;
      }

      if (gauges.length === 0) {
        toast.error("No gauges selected");
        return;
      }

      setBulkAddLoading(true);
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      try {
        // Process gauges sequentially to avoid overwhelming the API
        for (const gauge of gauges) {
          try {
            // Build payload using existing gauge data (similar to handleAddExistingGauge)
            // Try to get certificate_type_id from master gauge, fallback to gauge's own value
            const selectedGauge = gaugeMasterList.find(
              (g) => g.id === gauge.master_gauge_id
            );

            // Validate required fields
            if (!gauge.master_gauge_id) {
              errors.push(`"${gauge.identification_number}": Missing master gauge ID`);
              errorCount++;
              continue;
            }

            if (!gauge.identification_number) {
              errors.push(`Gauge ID ${gauge.id}: Missing identification number`);
              errorCount++;
              continue;
            }

            const payload = {
              client_org_id: clientId ?? "",
              master_gauge_id: gauge.master_gauge_id,
              gauge_class: gauge.gauge_class || "",
              certificate_type_id: selectedGauge?.certificate_type_id || gauge.certificate_type_id || "",
              identification_number: gauge.identification_number,
              calibration_frequency: Number(gauge.calibration_frequency) || 0,
               calibration_frequency_unit: (gauge.calibration_frequency_unit || "months") as "months" | "years",
              make: gauge.make || "",
              manf_serial_number: gauge.manf_serial_number || "",
              unit: (gauge.unit || "mm") as "mm" | "inch" | "µm" | "kg/cm2" | "bar" | "Pa" | "degree",
              calibration_location_type: normalizeCalibrationLocation(gauge.calibration_location_type),
              calibration_location: typeof gauge.calibration_location === "string" && !["permanent_facility", "site_facility", "mobile_facility", "customer_site"].includes(gauge.calibration_location) ? gauge.calibration_location : "",
              calibration_done_under: (gauge.calibration_done_under),
              specifications: gauge.specifications || {},
            };

            // Use default process for bulk add (calibration)
            await apiClient.patch(`/gauge/${gauge.id}`, payload);
            await mapGaugeToInwardState(inwardId, gauge.id, "calibration");
            successCount++;
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            errors.push(`"${gauge.identification_number || gauge.id}": ${errorMsg}`);
            errorCount++;
            // Log error for debugging
            if (process.env.NODE_ENV === 'development') {
              console.error(`Error adding gauge ${gauge.identification_number}:`, error);
            }
          }
        }

        // Refresh pending gauges list
        await fetchAllCurrentPendingInwardedGauges(
          inwardId,
          true,
          undefined,
          {
            page: linkedGaugePage,
            limit: linkedGaugeRowsPerPage,
          }
        );

        // Show summary toast
        if (successCount > 0 && errorCount === 0) {
          toast.success(`✅ Successfully added ${successCount} gauge(s) to inward!`);
        } else if (successCount > 0 && errorCount > 0) {
          toast.warning(
            `⚠️ Added ${successCount} gauge(s), ${errorCount} failed. ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "..." : ""}`
          );
          // Log full errors for debugging
          if (process.env.NODE_ENV === 'development') {
            console.error("Bulk add errors:", errors);
          }
        } else {
          toast.error(`❌ Failed to add ${errorCount} gauge(s). ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "..." : ""}`);
          // Log full errors for debugging
          if (process.env.NODE_ENV === 'development') {
            console.error("Bulk add errors:", errors);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : "Failed to process bulk add";
        toast.error(errorMessage);
        // Log error for debugging
        if (process.env.NODE_ENV === 'development') {
          console.error("Bulk add error:", error);
        }
      } finally {
        setBulkAddLoading(false);
      }
    },
    [
      inwardId,
      clientId,
      gaugeMasterList,
      mapGaugeToInwardState,
      fetchAllCurrentPendingInwardedGauges,
      linkedGaugePage,
      linkedGaugeRowsPerPage,
    ]
  );

  if (!inwardId) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600">
          Inward Entry Not Found
        </h2>
        <p className="mt-2">
          The inward entry you're looking for doesn't exist.
        </p>
        <Button
          onPress={() => navigate(backTo)}
          className="mt-4"
        >
          Back to Inward List
        </Button>
      </div>
    );
  }
  return (
    <PageContainer>
      <div className="mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-bold text-gray-800">

            Register Gauge for Inward
          </h2>
          <Button

            onPress={() => navigate(backTo)}
          >
            Back to Inward List
          </Button>
        </div>

        {/* Client and Inward Information Header */}
        {(clientName || inwardDate) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">
                  Company/Organization
                </h3>
                {clientName ? (
                  <p className="text-lg font-semibold text-blue-900">{clientName}</p>
                ) : (
                  <p className="text-blue-600">Not available</p>
                )}
              </div>
           
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">
                  Inward Number
                </h3>
                {inward_no ? (
                  <p className="text-lg font-semibold text-blue-900">{inward_no}</p>
                ) : (
                  <p className="text-blue-600">Not available</p>
                )}
              </div>
                 <div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">
                  Inward Date
                </h3>
                {inwardDate ? (
                  <p className="text-lg font-semibold text-blue-900">
                    {new Date(inwardDate).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="text-blue-600">Not available</p>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Tab Navigation */}
        <div className="flex w-full flex-col bg-white border border-gray-200 rounded-md shadow-sm p-2">
          <Tabs aria-label="Options" variant="secondary" selectedKey={selectedKey} onSelectionChange={(key) => {
            // Save form data before switching tabs
            if (selectedKey === "addNewGauge" && formRef.current) {
              const currentFormData = formRef.current.saveFormData();
              if (currentFormData && Object.keys(currentFormData).length > 0) {
                setSavedFormData(currentFormData);
              }
            }
            setSelectedKey(key as "addNewGauge" | "addExistingGauges" | "addDataSaveGauges");
          }}>
            <Tabs.ListContainer><Tabs.List aria-label="Gauge registration options">
              <Tabs.Tab id="addNewGauge">Add New Gauge</Tabs.Tab>
              <Tabs.Tab id="addExistingGauges">Add Existing Gauges</Tabs.Tab>
              <Tabs.Tab id="addDataSaveGauges">Add Data Save Gauges</Tabs.Tab>
            </Tabs.List></Tabs.ListContainer>
            <Tabs.Panel id="addNewGauge">
              <Card>
                <Card.Content className="p-0">
                  {/* Form Header */}
                  <div
                    className={`p-3 border-b border-gray-200 rounded-t-md ${isEditing ? "bg-orange-600" : "bg-blue-600"
                      } text-white`}
                  >
                    <h3 className="text-lg font-semibold">
                      {isEditing ? "Edit Gauge" : "Gauge Inward Form"}
                    </h3>

                  </div>
                  <InwardGaugeForm
                    key={formRenderKey}
                    ref={formRef}
                    onSubmit={onSubmit}
                    onCancel={handleFormClose}
                    isEditing={isEditing}
                    submitMode={prefilledGaugeSource && !isEditing ? "map" : "create"}
                    initialData={editingFormData || savedFormData}
                    gaugeMasterList={gaugeMasterList}
                    certificateTypes={certificateTypes}
                    gaugeMasterLoading={gaugeMasterLoading}
                    certificateTypeLoading={certificateTypeLoading}
                    isSubmitting={isSubmitting}
                    legacySpecification={legacySpecification}
                    onIdentificationNumberChange={(identificationNumber) => {
                      const trimmedId = identificationNumber?.trim() || "";
                      const previousId = previousIdentificationNumberRef.current;
                      const wasFoundBefore = foundInExistingGauges;
                      
                      if (trimmedId.length > 0) {
                        const found = existingGauges.some(
                          (gauge) => gauge.identification_number?.toLowerCase() === trimmedId.toLowerCase()
                        );
                        
                        // Only show toast if status changed from not found to found (and ID actually changed)
                        if (found && !wasFoundBefore && previousId !== trimmedId) {
                          toast.info("This gauge exists in your existing gauges. Check the 'Add Existing Gauges' tab.", {
                            duration: 5000,
                          });
                          // Auto-filter the table with this identification number
                          setMatchedIdentificationNumber(trimmedId);
                        }
                        
                        setFoundInExistingGauges(found);
                        previousIdentificationNumberRef.current = trimmedId;
                      } else {
                        setFoundInExistingGauges(false);
                        setMatchedIdentificationNumber("");
                        previousIdentificationNumberRef.current = "";
                      }
                    }}
                  />
                </Card.Content>
              </Card>
            </Tabs.Panel>
            <Tabs.Panel id="addExistingGauges">
              <Card>
                <Card.Content className="p-0">
                  <div className="mb-4">
                    <div className="p-3 border-b border-gray-200 rounded-t-md bg-blue-600 text-white">
                      <h3 className="text-lg font-semibold">Existing Gauges</h3>
                    </div>
                    <Suspense fallback={<TableSectionFallback />}>
                      <ExistingGaugesTable
                        data={nonDataSaveExistingGauges}
                        onAddGauge={(gauge) => handleAddGauge(gauge, "existing")}
                        onBulkAddGauges={handleBulkAddExistingGauges}
                        loading={existingGaugeLoading}
                        bulkAddLoading={bulkAddLoading}
                        externalIdentificationNumber={matchedIdentificationNumber}
                        page={existingGaugePage}
                        rowsPerPage={existingGaugeRowsPerPage}
                        totalItems={existingGaugesPagination.total}
                        totalPages={existingGaugesPagination.totalPages}
                        isServerPagination
                        onPageChange={setExistingGaugePage}
                        onRowsPerPageChange={setExistingGaugeRowsPerPage}
                      />
                    </Suspense>
                  </div>
                </Card.Content>
              </Card>
            </Tabs.Panel>
            <Tabs.Panel id="addDataSaveGauges">
              <Card>
                <Card.Content className="p-0">
                  <div className="mb-4">
                    <div
                      className="p-3 border-b border-gray-200 rounded-t-md bg-blue-600 text-white"
                    >
                      <h3 className="text-lg font-semibold">
                        Data Save Gauges
                      </h3>

                    </div>
                    <Suspense fallback={<TableSectionFallback />}>
                      <DataSaveGaugesTable
                        data={dataSaveGauges}
                        onAddGauge={(gauge) => handleAddGauge(gauge, "data_save")}
                        onDeleteGauge={handleDeleteDataSaveRequest}
                        loading={isDataSaveLoading}
                      />
                    </Suspense>

                  </div>
                </Card.Content>
              </Card>
            </Tabs.Panel>
          </Tabs>
          {inwardId && (
            <div className="w-full">
              {error && !isInwardLinkedGaugesLoading ? (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
                  <span>{error}</span>
                  <Button size="sm" variant="danger-soft" onPress={retryLinkedGauges}>
                    Retry
                  </Button>
                </div>
              ) : null}
              <Suspense fallback={<TableSectionFallback />}>
                <InwardLinkedGaugesTable
                  data={currentInwardPendingById[inwardId] || []}
                  onEdit={handleEditGauge}
                  onDelete={handleDeleteGaugeRequest}
                  loading={isInwardLinkedGaugesLoading}
                  isPreview={false}
                  onPrintSticker={handlePrintStickerClick}
                  page={linkedGaugePage}
                  rowsPerPage={linkedGaugeRowsPerPage}
                  totalItems={currentInwardPendingMetaById[inwardId]?.total}
                  totalPages={currentInwardPendingMetaById[inwardId]?.totalPages}
                  isServerPagination
                  onPageChange={setLinkedGaugePage}
                  onRowsPerPageChange={setLinkedGaugeRowsPerPage}
                  searchValue={linkedGaugeSearch}
                  onSearchChange={setLinkedGaugeSearch}
                  searchPlaceholder="Search by gauge name, organization name, Lab ID, identification number..."
                />
              </Suspense>
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
          <Modal.Backdrop>
            <Modal.Container size="sm">
              <Modal.Dialog>
                <Modal.Heading>Delete Gauge</Modal.Heading>
                <Modal.Body>
                  Are you sure you want to delete this gauge? This action cannot be undone.
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onPress={onClose}>
                    Close
                  </Button>
                  <Button variant="danger" onPress={() => {
                    onClose();
                    confirmDeleteGauge();
                    setGaugeIdToDelete(null);
                  }}>
                    Delete
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>

        {/* Sticker Settings Modal */}
        <StickerSettingsSimpleModal
          isOpen={isStickerSettingsOpen}
          onClose={onStickerSettingsClose}
          onConfirm={handleStickerSettingsConfirm}
          selectedCount={selectedGaugeIdsForSticker.length}
        />
      </div>

    </PageContainer >
  );
}
