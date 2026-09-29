import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Button } from "../../../../components/ui/button";
import { ArrowLeftIcon, ExclamationTriangleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { PageLoader } from "../../../../components/ui/loader";
import { toast } from "sonner";
import { Badge } from "../../../../components/ui/badge";
import { Input, TextArea, ListBox, Select } from "@heroui/react";
import { GaugeTypeCalibrationRenderer } from "../../../../components/calibration/GaugeTypeCalibrationRenderer";
import { GaugeSpecificationRenderer } from "../../../../components/specifications/GaugeSpecificationRenderer";
import { TagsInput } from "../../../../components/TagsInput";
import { Specifications } from "../../../../types/index";
import { useInwardGaugeStore } from "../../../../store/inwardGaugeStore";
import { useCertificateStore } from "../../../../store/certificateStore";
import EquipmentSelector from "../../../../components/CalibrationEquipments/EquipmentSelector";
import { useEquipmentsWithQuery } from "../../../../hooks/useEquipmentsWithQuery";
import { useOptimizedNavigation } from "../../../../hooks/useOptimizedNavigation";
import { normalizeObservationNumbers } from "../../../../utils/observationNumberNormalizer";
import { buildCalibrationObservationsPayload } from "../../../../components/calibration/observationPayload";
import {
  recalculateLimitGaugeObservations,
  type LimitGaugeSpecifications,
} from "../../../../components/calibration/common/limitGaugeDecision";
import { useShallow } from "zustand/react/shallow";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../../services/api";
import { API_ENDPOINTS } from "../../../../config/api";
import { queryKeys } from "../../../../hooks/queries/queryKeys";
import { Modal } from "../../../../components/ui/modal";
import { transformSpecificationsForPayload } from "../../../../utils/specificationTransform";
import { mergeRemarksWithGaugeDefaults } from "../../../../utils/defaultGaugeRemarks";
import { useSurfacePlateReferenceStandardDetailQuery } from "../../../../hooks/queries/surfacePlateReferenceStandards";
import { useAuth } from "../../../../features/auth/hooks/useAuth";
type DynamicObservations = Record<string, unknown>;
type ErrorWithResponse = {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
};

type CalibrationFormValues = {
  observations: DynamicObservations;
  gauge_name?: string;
  make?: string;
  identification_number?: string;
  serial_number?: string;
  calibration_frequency?: string;
  calibration_frequency_unit?: 'days' | 'months' | 'years';
  specifications?: Partial<Specifications> | string[] | null;
  calibration_location?: string;
  calibration_type?: 'fully' | 'partially';
  gauge_condition?: string;
  conformity_statement?: string;
  remark?: string[];
  environmental_conditions?: string;
  uncertainty?: string;
  calibration_method?: string;
  certificate_date?: string;
  calibration_date?: string;
  unit?: string;
};

const getTodayDateInputValue = (): string => {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
};

const fieldLabelClassName =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700";

const editableFieldClassName = "text-sm font-medium text-slate-900 border border-slate-200 bg-slate-50";
const readOnlyFieldClassName = "text-sm font-medium text-slate-700 border border-slate-200 bg-slate-100";

const V3Select = ({ value, onChange, options, placeholder, ariaLabel }: { value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; placeholder: string; ariaLabel: string }) => (
  <Select selectedKey={value || null} onSelectionChange={(key) => onChange(key ? String(key) : "")} placeholder={placeholder} aria-label={ariaLabel}>
    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
    <Select.Popover><ListBox>{options.map((option) => <ListBox.Item key={option.value} id={option.value} textValue={option.label}>{option.label}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
  </Select>
);

const sectionClassName = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm";

const extractEquipmentIds = (equipmentPayload: unknown): string[] => {
  if (!Array.isArray(equipmentPayload)) return [];

  return equipmentPayload
    .map((equipment) => {
      if (typeof equipment === "string") return equipment;
      if (equipment && typeof equipment === "object") {
        return (equipment as { id?: string }).id;
      }
      return undefined;
    })
    .filter((id): id is string => Boolean(id));
};

const getSubmissionErrorMessage = (error: unknown): string => {
  const errorWithResponse = error as ErrorWithResponse;
  return errorWithResponse.response?.data?.message || errorWithResponse.message || "Submission failed";
};

const getCertificateUrl = (record: unknown): string | null => {
  if (!record || typeof record !== "object") return null;
  const maybeRecord = record as { certificate_url?: unknown };
  return typeof maybeRecord.certificate_url === "string" && maybeRecord.certificate_url.trim()
    ? maybeRecord.certificate_url
    : null;
};

const getCertificateId = (record: unknown): string | null => {
  if (!record || typeof record !== "object") return null;
  const maybeRecord = record as { certificate_id?: unknown };
  return typeof maybeRecord.certificate_id === "string" && maybeRecord.certificate_id.trim()
    ? maybeRecord.certificate_id
    : null;
};

const ATTENTION_KEYWORDS = [
  "out_of_specification_limit",
  "out of specification",
  "wear_limit_reached",
  "wear limit reached",
  "rejected_below_wear_limit",
  "rejected / below wear limit",
  "below wear limit",
  "specification_missing",
  "specification missing",
  "observation_missing",
  "observation missing",
  "invalid",
  "attention",
  "required",
];

type AttentionRemarkEntry = {
  path: string;
  value: string;
};

const normalizeAttentionText = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const GO_NO_GO_GAUGE_TYPES = new Set([
  "od limit gauge",
  "id limit gauge",
  "thread plug gauge",
  "thread ring gauge",
  "plain taper plug gauge",
  "plain taper ring gauge",
]);

const isGoNoGoGaugeType = (value?: string | null) =>
  GO_NO_GO_GAUGE_TYPES.has((value || "").toLowerCase().trim());

const RECOMPUTABLE_LIMIT_GAUGE_TYPES = new Set([
  "od limit gauge",
  "id limit gauge",
]);

const supportsSpecificationRecalculation = (value?: string | null) =>
  RECOMPUTABLE_LIMIT_GAUGE_TYPES.has((value || "").toLowerCase().trim());

const normalizeCalibrationSpecifications = (
  specifications: CalibrationFormValues["specifications"]
): CalibrationFormValues["specifications"] =>
  transformSpecificationsForPayload(specifications) as CalibrationFormValues["specifications"];

const normalizeRemarkTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
};

const resolveSubmittedRemarks = ({
  currentValue,
  persistedValue,
  wasEdited,
}: {
  currentValue: unknown;
  persistedValue: unknown;
  wasEdited: boolean;
}): string[] => {
  const normalizedCurrentValue = normalizeRemarkTags(currentValue);

  if (normalizedCurrentValue.length > 0 || wasEdited) {
    return normalizedCurrentValue;
  }

  return normalizeRemarkTags(persistedValue);
};

const isRemarkLikePath = (pathSegments: string[]) =>
  pathSegments.some((segment) => {
    const normalizedSegment = segment.toLowerCase();
    return normalizedSegment.includes("remark") || normalizedSegment.includes("status");
  });

const shouldFlagAttentionValue = (value: string) => {
  const normalizedValue = value.trim().toLowerCase();
  return ATTENTION_KEYWORDS.some((keyword) => normalizedValue.includes(keyword));
};

const formatAttentionPath = (pathSegments: string[]) =>
  pathSegments
    .filter((segment) => segment !== "observations" && segment !== "remarks")
    .map((segment) =>
      segment
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    )
    .join(" / ") || "Observation";

const collectAttentionRemarkEntries = (
  value: unknown,
  pathSegments: string[] = []
): AttentionRemarkEntry[] => {
  if (typeof value === "string") {
    if (!isRemarkLikePath(pathSegments) || !shouldFlagAttentionValue(value)) {
      return [];
    }

    return [
      {
        path: formatAttentionPath(pathSegments),
        value: value.trim(),
      },
    ];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectAttentionRemarkEntries(item, [...pathSegments, String(index)])
    );
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      collectAttentionRemarkEntries(child, [...pathSegments, key])
    );
  }

  return [];
};

const collectGoNoGoAttentionWarnings = (
  observations: Record<string, unknown>,
  gaugeType?: string | null
): AttentionRemarkEntry[] => {
  if (!isGoNoGoGaugeType(gaugeType)) {
    return [];
  }

  const selectedTables = Array.isArray(observations.tables_to_print)
    ? observations.tables_to_print.filter((entry): entry is "go" | "nogo" =>
        entry === "go" || entry === "nogo"
      )
    : (["go", "nogo"] as Array<"go" | "nogo">);

  const remarksRecord =
    observations.remarks && typeof observations.remarks === "object"
      ? (observations.remarks as Record<string, unknown>)
      : null;

  const getNestedRemark = (sectionKey: "go" | "no_go") => {
    const section = observations[sectionKey];
    if (section && typeof section === "object") {
      const sectionRemark = (section as Record<string, unknown>).remark;
      if (typeof sectionRemark === "string") return sectionRemark;
    }
    return "";
  };

  const warnings: AttentionRemarkEntry[] = [];

  if (selectedTables.includes("go")) {
    const goRemark =
      (typeof remarksRecord?.go === "string" ? remarksRecord.go : "") ||
      getNestedRemark("go");

    if (goRemark && shouldFlagAttentionValue(goRemark)) {
      warnings.push({
        path: "GO Remark",
        value: goRemark.trim(),
      });
    }
  }

  if (selectedTables.includes("nogo")) {
    const noGoRemark =
      (typeof remarksRecord?.no_go === "string" ? remarksRecord.no_go : "") ||
      getNestedRemark("no_go");

    if (noGoRemark && shouldFlagAttentionValue(noGoRemark)) {
      warnings.push({
        path: "NO GO Remark",
        value: noGoRemark.trim(),
      });
    }
  }

  return warnings;
};

const GO_NO_GO_WARNING_PATHS = new Set([
  "go",
  "go remark",
  "go / remark",
  "no go",
  "no go remark",
  "no go / remark",
]);

const dedupeAttentionWarnings = (warnings: AttentionRemarkEntry[]) => {
  const seen = new Set<string>();

  return warnings.filter((warning) => {
    const key = `${normalizeAttentionText(warning.path)}::${normalizeAttentionText(warning.value)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const NablCalibrationProcessPage = () => {
  const { inwardId, gaugeId } = useParams<{ inwardId: string; gaugeId: string }>();
  const location = useLocation();
  const { navigateBack } = useOptimizedNavigation();
  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [observations, setObservations] = useState<DynamicObservations>({});
  const [specifications, setSpecifications] = useState<Partial<Specifications | string[] | null>>(null);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [isGaugeDataReady, setIsGaugeDataReady] = useState(false);
  const [isAttentionModalOpen, setIsAttentionModalOpen] = useState(false);
  const [attentionWarnings, setAttentionWarnings] = useState<AttentionRemarkEntry[]>([]);
  const [attentionModalDescription, setAttentionModalDescription] = useState(
    "Some observation remarks need attention. Please review the values again, or continue if you still want to proceed."
  );
  const requestSequenceRef = useRef(0);
  const pendingSubmissionRef = useRef<CalibrationFormValues | null>(null);
  const pendingSubmissionGeneratesCertificateRef = useRef(true);
  const lastObservationsKeyRef = useRef<string | null>(null);
  const lastSpecsKeyRef = useRef<string | null>(null);
  const lastEquipmentsKeyRef = useRef<string | null>(null);
  const lastGaugeKeyRef = useRef<string | null>(null);

  const isEditMode = useMemo(
    () => Boolean((location.state as { isEdit?: boolean } | null)?.isEdit),
    [location.state]
  );

  const form = useForm<CalibrationFormValues>({
    defaultValues: {
      observations: {},
      gauge_name: '',
      make: '',
      identification_number: '',
      serial_number: '',
      calibration_frequency: '',
      calibration_frequency_unit: 'months' as 'days' | 'months' | 'years',
      specifications: null,
      calibration_location: '',
      calibration_type: 'fully',
      gauge_condition: '',
      conformity_statement: '',
      remark: [],
      environmental_conditions: '',
      uncertainty: '',
      calibration_method: '',
      certificate_date: getTodayDateInputValue(),
      calibration_date: getTodayDateInputValue(),
      unit: 'mm',
    },
    mode: "onChange",
  });
  const watchedSpecifications = useWatch({
    control: form.control,
    name: "specifications",
  });

  const {
    FetchInwardedGaugeByGaugeIdAndInwardId,
    gaugeData,
    loadingCompositeGauge,
    submitUpdatedCertificateData,
  } = useInwardGaugeStore(
    useShallow((state) => ({
      FetchInwardedGaugeByGaugeIdAndInwardId: state.FetchInwardedGaugeByGaugeIdAndInwardId,
      gaugeData: state.currentInwardGauges,
      loadingCompositeGauge: state.loading.loadingCompositeGauge,
      submitUpdatedCertificateData: state.submitUpdatedCertificateData,
    }))
  );
  const { getCertificate, openPreviewModal, updatePreviewModal, closePreviewModal } = useCertificateStore(
    useShallow((state) => ({
      getCertificate: state.getCertificate,
      openPreviewModal: state.openPreviewModal,
      updatePreviewModal: state.updatePreviewModal,
      closePreviewModal: state.closePreviewModal,
    }))
  );
  const { user } = useAuth();
  const isPlatformSuperAdmin = user?.role === "super_admin" || user?.role === "superadmin";

  const { loading: equipmentLoading } = useEquipmentsWithQuery();
  const certificateDateValue = form.watch("certificate_date");
  const calibrationDateValue = form.watch("calibration_date");
  const effectiveSpecifications = useMemo(
    () => (
      watchedSpecifications ?? specifications ?? null
    ) as Partial<Specifications | string[] | null>,
    [watchedSpecifications, specifications]
  );
  const surfacePlateRefId = useMemo(() => {
    if (!effectiveSpecifications || Array.isArray(effectiveSpecifications)) {
      return null;
    }

    const refId = effectiveSpecifications.surface_plate_ref_id;
    return typeof refId === "string" && refId.trim() ? refId : null;
  }, [effectiveSpecifications]);
  const { data: surfacePlateReferenceStandard } = useSurfacePlateReferenceStandardDetailQuery(
    surfacePlateRefId,
    {
      enabled: gaugeData?.certificate_type?.trim().toLowerCase() === "surface plate",
    }
  );

  useEffect(() => {
    const today = getTodayDateInputValue();

    if (!certificateDateValue) {
      form.setValue("certificate_date", today, { shouldDirty: false });
    }

    if (!calibrationDateValue) {
      form.setValue("calibration_date", today, { shouldDirty: false });
    }
  }, [calibrationDateValue, certificateDateValue, form]);

  useEffect(() => {
    if (!inwardId || !gaugeId) return;

    requestSequenceRef.current += 1;
    const currentRequest = requestSequenceRef.current;
    const gaugeKey = `${inwardId}:${gaugeId}`;

    if (lastGaugeKeyRef.current !== gaugeKey) {
      lastGaugeKeyRef.current = gaugeKey;
      setIsGaugeDataReady(false);
      setObservations({});
      setSpecifications(null);
      setSelectedEquipmentIds([]);
      lastObservationsKeyRef.current = null;
      lastSpecsKeyRef.current = null;
      lastEquipmentsKeyRef.current = null;
    } else {
      setIsGaugeDataReady(false);
    }

    let isMounted = true;

    const load = async () => {
      try {
        const data = await FetchInwardedGaugeByGaugeIdAndInwardId(inwardId, gaugeId);
        if (!data || !isMounted || requestSequenceRef.current !== currentRequest) return;

        const loadedObservations = normalizeObservationNumbers<DynamicObservations>(
          (data.observations ?? {}) as DynamicObservations
        );
        const observationsKey = JSON.stringify(loadedObservations);
        const specsKey = JSON.stringify(data.specifications ?? null);
        const equipmentsKey = JSON.stringify(extractEquipmentIds(data.calibration_equipments));

        if (lastObservationsKeyRef.current !== observationsKey) {
          lastObservationsKeyRef.current = observationsKey;
          setObservations(loadedObservations);
        }
        if (lastSpecsKeyRef.current !== specsKey) {
          lastSpecsKeyRef.current = specsKey;
          setSpecifications((data.specifications ?? null) as Partial<Specifications | string[] | null>);
        }
        if (lastEquipmentsKeyRef.current !== equipmentsKey) {
          lastEquipmentsKeyRef.current = equipmentsKey;
          setSelectedEquipmentIds(extractEquipmentIds(data.calibration_equipments));
        }

        requestAnimationFrame(() => {
          if (!isMounted || requestSequenceRef.current !== currentRequest) return;
          if (lastObservationsKeyRef.current === observationsKey) {
            form.reset({
              observations: loadedObservations,
              gauge_name: data.master_gauge_name || '',
              make: data.make || '',
              identification_number: data.identification_number || '',
              serial_number: data.manf_serial_number || '',
              calibration_frequency: String(data.calibration_frequency || ''),
              calibration_frequency_unit: (data.calibration_frequency_unit as 'days' | 'months' | 'years') || 'months',
              specifications: (data.specifications ?? null) as Partial<Specifications> | string[] | null,
              calibration_location: data.calibration_location_type || '',
              calibration_type: 'fully',
              gauge_condition: data.gauge_condition || '',
              conformity_statement: '',
              remark: mergeRemarksWithGaugeDefaults(
                data.certificate_type,
                normalizeRemarkTags(data.remark)
              ),
              environmental_conditions: data.environmental_conditions || '',
              uncertainty: data.uncertainty || '',
              calibration_method: data.calibration_method || '',
              certificate_date: data.certificate_date || getTodayDateInputValue(),
              calibration_date: data.calibration_date || getTodayDateInputValue(),
              unit: data.unit || 'mm',
            });
          }
          setIsGaugeDataReady(true);
        });
      } catch (err) {
        console.error("Failed loading gauge data", err);
        if (!isMounted || requestSequenceRef.current !== currentRequest) return;
        setIsGaugeDataReady(true);
        toast.error("Failed to load gauge data. Please try again.");
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [inwardId, gaugeId, FetchInwardedGaugeByGaugeIdAndInwardId, form]);

  useEffect(() => {
    if (gaugeData?.certificate_type?.trim().toLowerCase() !== "surface plate") {
      return;
    }

    if (!surfacePlateReferenceStandard) {
      return;
    }

    const currentRemarks = form.getValues("remark");
    const mergedRemarks = mergeRemarksWithGaugeDefaults(
      gaugeData?.certificate_type,
      currentRemarks,
      {
        surfacePlateReferenceStandard,
      }
    );

    const normalizedCurrentRemarks = normalizeRemarkTags(currentRemarks);
    const hasChanged =
      mergedRemarks.length !== normalizedCurrentRemarks.length ||
      mergedRemarks.some((remark, index) => remark !== normalizedCurrentRemarks[index]);

    if (hasChanged) {
      form.setValue("remark", mergedRemarks, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
  }, [form, gaugeData?.certificate_type, surfacePlateReferenceStandard]);

  const executeCalibrationSubmit = useCallback(
    async (formPayload: CalibrationFormValues, generateCertificate: boolean) => {
      if (!gaugeData) {
        toast.error("Gauge data not loaded");
        return;
      }

      setIsSubmitting(true);

      try {
        const inward_id = gaugeData?.inward_id || gaugeData?.id;
        const master_gauge_id = gaugeData?.gauge_id || gaugeId;

        if (!inward_id || !master_gauge_id) {
          toast.error("Missing inward or gauge ID");
          setIsSubmitting(false);
          return;
        }

        const liveObservations = form.getValues("observations");
        const liveSpecifications = form.getValues("specifications");
        const observationsForSubmit = isGoNoGoGaugeType(gaugeData?.certificate_type)
          ? recalculateLimitGaugeObservations(
              liveObservations ?? formPayload?.observations ?? observations,
              (liveSpecifications ?? effectiveSpecifications ?? null) as LimitGaugeSpecifications | null
            ).observations
          : liveObservations ?? formPayload?.observations ?? observations;

        if (isGoNoGoGaugeType(gaugeData?.certificate_type)) {
          form.setValue("observations", observationsForSubmit, {
            shouldDirty: false,
            shouldValidate: false,
          });
        }

        const normalizedObservations = buildCalibrationObservationsPayload({
          gaugeType: gaugeData?.certificate_type,
          observations: observationsForSubmit,
          specifications: liveSpecifications ?? effectiveSpecifications ?? undefined,
        });
        const normalizedObservationSnapshot = normalizeObservationNumbers<DynamicObservations>(
          normalizedObservations as DynamicObservations
        );
        const observationSnapshotKey = JSON.stringify(normalizedObservationSnapshot);
        lastObservationsKeyRef.current = observationSnapshotKey;
        setObservations(normalizedObservationSnapshot);

        const formValues = form.getValues();
        const rawSpecifications = formValues.specifications ?? effectiveSpecifications ?? null;
        const normalizedSpecifications = normalizeCalibrationSpecifications(
          Array.isArray(rawSpecifications)
            ? rawSpecifications.filter((value): value is string => typeof value === 'string')
            : rawSpecifications
        );
        const specificationSnapshotKey = JSON.stringify(normalizedSpecifications ?? null);
        if (lastSpecsKeyRef.current !== specificationSnapshotKey) {
          lastSpecsKeyRef.current = specificationSnapshotKey;
          setSpecifications(
            (normalizedSpecifications ?? null) as Partial<Specifications | string[] | null>
          );
        }

        // First update gauge-specific fields using direct API call
        const gaugeUpdateData = {
          gauge_condition: formValues.gauge_condition,
          gauge_name: formValues.gauge_name,
          identification_number: formValues.identification_number,
          specifications: normalizedSpecifications ?? undefined,
          serial_number: formValues.serial_number,
          make: formValues.make,
          calibration_frequency: formValues.calibration_frequency ? Number(formValues.calibration_frequency) : undefined,
          calibration_location: formValues.calibration_location,
        };
        const inwardGaugeRecordId = gaugeData.id;
        if (!inwardGaugeRecordId) {
          throw new Error("Missing inward gauge record ID");
        }
        // Update only this inward calibration cycle; never mutate the shared gauge.
        const resp = await apiClient.patch(
          API_ENDPOINTS.GAUGES.INWARD_RECORD(inwardGaugeRecordId, inward_id),
          {
            ...gaugeUpdateData,
            manf_serial_number: gaugeUpdateData.serial_number,
            master_gauge_id: gaugeData.master_gauge_id,
          }
        );
        if (resp)
          toast.success("Gauge information updated successfully!");

        // Then proceed with certificate submission for remaining fields
        const normalizedRemarks = resolveSubmittedRemarks({
          currentValue: mergeRemarksWithGaugeDefaults(
            gaugeData?.certificate_type,
            formValues.remark,
            {
              surfacePlateReferenceStandard,
            }
          ),
          persistedValue: gaugeData?.remark,
          wasEdited: Boolean(form.formState.dirtyFields.remark),
        });

        const payloadWithEquipments = {
          observations: normalizedObservations,
          equipment_ids: selectedEquipmentIds,
          status: "calibration_completed",
          calibration_frequency_unit: formValues.calibration_frequency_unit as 'days' | 'months' | 'years' | undefined,
          calibration_type: formValues.calibration_type,
          conformity_statement: formValues.conformity_statement,
          remark: normalizedRemarks,
          environmental_conditions: formValues.environmental_conditions,
          uncertainty: formValues.uncertainty,
          calibration_method: formValues.calibration_method,
          certificate_date: formValues.certificate_date,
          calibration_date: formValues.calibration_date,
          specifications: Array.isArray(normalizedSpecifications)
            ? undefined
            : normalizedSpecifications ?? undefined,
        };


        const updatedCertificate = await submitUpdatedCertificateData(inward_id, master_gauge_id, payloadWithEquipments, {
          generateCertificate,
          awaitCertificateGeneration: generateCertificate,
        });
        if (!updatedCertificate) {
          return;
        }
        const successMessage = !generateCertificate
          ? "Observations updated successfully!"
          : isEditMode
            ? "Certificate updated successfully!"
            : "Calibration completed successfully!";
        toast.success(successMessage);
        queryClient.invalidateQueries({
          queryKey: queryKeys.gauges.lists(),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.gauges.byInwardAndGauge(inward_id, master_gauge_id),
        });

        if (!generateCertificate) {
          navigateBack(`/transactions/calibration-certificate`);
          return;
        }

        const fallbackPath = `/transactions/calibration-certificate`;
        const certificateId = getCertificateId(updatedCertificate);
        if (certificateId) {
          openPreviewModal({
            certificateUrl: null,
            isLoading: true,
            loadingText: "Preparing certificate preview...",
          });
          navigateBack(fallbackPath);

          const certificate = await getCertificate(certificateId);
          if (certificate?.certificateUrl) {
            updatePreviewModal({
              certificateUrl: certificate.certificateUrl,
              isLoading: false,
              loadingText: "Rendering certificate preview...",
            });
            return;
          }

          closePreviewModal();
          toast.error("Certificate was saved, but preview URL is not available right now.");
          return;
        }

        const certificateUrl = getCertificateUrl(updatedCertificate);
        if (certificateUrl) {
          openPreviewModal({
            certificateUrl,
            isLoading: false,
            loadingText: "Loading certificate...",
          });
          navigateBack(fallbackPath);
          return;
        }

        toast.error("Certificate was saved, but preview URL is not available right now.");
        navigateBack(fallbackPath);
      } catch (err: unknown) {
        console.error("Calibration submission error:", err);
        const errorMessage = getSubmissionErrorMessage(err);
        toast.error(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      gaugeData,
      gaugeId,
      effectiveSpecifications,
      isEditMode,
      form,
      observations,
      selectedEquipmentIds,
      submitUpdatedCertificateData,
      getCertificate,
      navigateBack,
      openPreviewModal,
      updatePreviewModal,
      closePreviewModal,
      queryClient,
      surfacePlateReferenceStandard,
    ]
  );

  const handleSubmitCalibration = useCallback(
    async (formPayload: CalibrationFormValues, generateCertificate = true) => {
      const liveObservations = form.getValues("observations");
      const liveSpecifications = form.getValues("specifications");
      const observationsForValidation = isGoNoGoGaugeType(gaugeData?.certificate_type)
        ? recalculateLimitGaugeObservations(
            liveObservations ?? formPayload?.observations ?? observations,
            (liveSpecifications ?? effectiveSpecifications ?? null) as LimitGaugeSpecifications | null
          ).observations
        : liveObservations ?? formPayload?.observations ?? observations;

      if (isGoNoGoGaugeType(gaugeData?.certificate_type)) {
        form.setValue("observations", observationsForValidation, {
          shouldDirty: false,
          shouldValidate: false,
        });
      }

      const normalizedObservations = buildCalibrationObservationsPayload({
        gaugeType: gaugeData?.certificate_type,
        observations: observationsForValidation,
        specifications: liveSpecifications ?? effectiveSpecifications ?? undefined,
      });

      const explicitGoNoGoWarnings = collectGoNoGoAttentionWarnings(
        normalizedObservations,
        gaugeData?.certificate_type
      );
      const genericWarnings = collectAttentionRemarkEntries(normalizedObservations, ["observations"]);
      const filteredGenericWarnings =
        explicitGoNoGoWarnings.length > 0
          ? genericWarnings.filter(
              (warning) => !GO_NO_GO_WARNING_PATHS.has(normalizeAttentionText(warning.path))
            )
          : genericWarnings;
      const warnings = dedupeAttentionWarnings([
        ...explicitGoNoGoWarnings,
        ...filteredGenericWarnings,
      ]);

      if (warnings.length > 0) {
        pendingSubmissionRef.current = formPayload;
        pendingSubmissionGeneratesCertificateRef.current = generateCertificate;
        setAttentionWarnings(warnings);
        setAttentionModalDescription(
          explicitGoNoGoWarnings.length > 0
            ? "The remarks for GO or NO GO contain invalid values or are out of specification. Would you like to review and fix the observations, or continue anyway?"
            : "Some observation remarks need attention. Please review the values again, or continue if you still want to proceed."
        );
        setIsAttentionModalOpen(true);
        return;
      }

      await executeCalibrationSubmit(formPayload, generateCertificate);
    },
    [executeCalibrationSubmit, effectiveSpecifications, form, gaugeData?.certificate_type, observations]
  );

  const handleContinueAfterAttentionWarning = useCallback(async () => {
    const pendingPayload = pendingSubmissionRef.current;
    const shouldGenerateCertificate = pendingSubmissionGeneratesCertificateRef.current;
    setIsAttentionModalOpen(false);

    if (!pendingPayload) {
      return;
    }

    pendingSubmissionRef.current = null;
    pendingSubmissionGeneratesCertificateRef.current = true;
    await executeCalibrationSubmit(pendingPayload, shouldGenerateCertificate);
  }, [executeCalibrationSubmit]);

  const handleCloseAttentionModal = useCallback(() => {
    setIsAttentionModalOpen(false);
  }, []);

  const handleBack = useCallback(() => {
    const fallbackPath = `/transactions/calibration-certificate`;
    navigateBack(fallbackPath);
  }, [navigateBack]);

  const handleCancel = useCallback(() => {
    const fallbackPath = `/transactions/calibration-certificate`;
    navigateBack(fallbackPath);
  }, [navigateBack]);

  const handleEquipmentChange = useCallback((ids: string[]) => {
    setSelectedEquipmentIds(ids);
  }, []);

  const isCalibrationCompleted = gaugeData?.status === "calibration_completed";
  const isSpecificationRecalculationEnabled = supportsSpecificationRecalculation(
    gaugeData?.certificate_type
  );
  const isSpecificationSectionReadOnly =
    !isSpecificationRecalculationEnabled || (isCalibrationCompleted && !isEditMode);
  const submitButtonText = isEditMode ? "Update Certificate" : "Generate Certificate";
  const readyTitle = isEditMode ? "Ready to Update Certificate?" : "Ready to Generate Certificate?";
  const observationsOnlyButtonText = isEditMode ? "Update Observations" : "Save Observations";

  if (!isGaugeDataReady && (loadingCompositeGauge || !!gaugeData)) {
    return <PageLoader text="Loading gauge data..." />;
  }

  if (!gaugeData && !loadingCompositeGauge) {
    return (
      <div className="container mx-auto p-4 text-center">
        <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-3" />
        <p>No gauge data found. Please go back.</p>
        <Button onClick={handleBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }
  return (
    <>
      <div className="min-h-auto bg-white rounded-md border border-gray-200">
      <div>
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleBack} className="flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50">
                <ArrowLeftIcon className="w-4 h-4" /> Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">
                  {isEditMode ? "Edit NABL Calibration Certificate" : "NABL Calibration Certificate"}
                </h1>
                <p className="text-sm text-blue-100 mt-1">Observation Sheet & Calibration Report</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditMode && (
                <Badge className="bg-orange-500 text-white border-0 font-semibold">
                  ✏️ Edit Mode
                </Badge>
              )}
              <Badge className="bg-white text-blue-700 border-0 font-semibold">NABL Accredited</Badge>
              {isCalibrationCompleted && (
                <Badge className="bg-green-500 text-white border-0">Completed</Badge>
              )}
            </div>
          </div>
        </div>

        <FormProvider {...form}>
          <form onSubmit={(event) => { void form.handleSubmit((values) => handleSubmitCalibration(values, true))(event); }}>
            <div className="p-2">
              {/* Section 1: Certificate Information */}
              <div className={sectionClassName}>
                <h2 className="mb-4 border-b border-slate-200 pb-2 text-base font-bold text-slate-900">
                  Certificate Information
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className={fieldLabelClassName}>Company Name</label>
                    <Input
                      value={gaugeData?.client_org_name || "N/A"}
                      readOnly
                      aria-label="client name"
                      className={readOnlyFieldClassName}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClassName}>DC No</label>
                    <Input
                      value={gaugeData?.client_dc_no || "N/A"}
                      readOnly

                      className={readOnlyFieldClassName}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClassName}>DC Date</label>
                    <Input
                      value={gaugeData?.client_dc_date
                        ? new Date(gaugeData?.client_dc_date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                        : "N/A"}
                      readOnly
                      aria-label="client dc date"
                      className={readOnlyFieldClassName}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClassName}>Inward Date</label>
                    <Input
                      value={gaugeData?.inward_date
                        ? new Date(gaugeData.inward_date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                        : "N/A"}
                      readOnly
                      aria-label='inward date'
                      className={readOnlyFieldClassName}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClassName}>LAB ID</label>
                    <Input
                      value={gaugeData?.inward_gauge_lab_id || "N/A"}
                      readOnly
                      aria-label="lab id"
                      className={readOnlyFieldClassName}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClassName}>Certificate Date *</label>
                    <Input
                      type="date"
                      value={certificateDateValue || ""}
                      onChange={(event) =>
                        form.setValue("certificate_date", event.target.value, {
                          shouldDirty: true,
                          shouldTouch: true,
                        })
                      }
                      aria-label="certificate date"
                      className={editableFieldClassName}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClassName}>Calibration Date *</label>
                    <Input
                      type="date"
                      value={calibrationDateValue || ""}
                      onChange={(event) =>
                        form.setValue("calibration_date", event.target.value, {
                          shouldDirty: true,
                          shouldTouch: true,
                        })
                      }
                      aria-label="calibration date"
                      className={editableFieldClassName}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Gauge Details */}
              <div className={`mt-3 ${sectionClassName}`}>
                <h2 className="mb-4 border-b border-slate-200 pb-2 text-base font-bold text-slate-900">
                  Gauge Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className={fieldLabelClassName}>Gauge Name *</label>
                    <Input
                      {...form.register('gauge_name')}
                      placeholder="Enter gauge name"
                      aria-label="gauge name"
                      className={editableFieldClassName}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClassName}>Make *</label>
                    <Input
                      {...form.register('make')}
                      placeholder="Enter make"
                      aria-label="make"
                      className={editableFieldClassName}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClassName}>Identification Number *</label>
                    <Input
                      {...form.register('identification_number')}
                      placeholder="Enter identification number"
                      aria-label="identification number"
                      className={editableFieldClassName}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClassName}>Serial Number *</label>
                    <Input
                      {...form.register('serial_number')}
                      placeholder="Enter serial number"
                      aria-label="serial number"
                      className={editableFieldClassName}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClassName}>Calibration Frequency *</label>
                    <div className="flex gap-2">
                      <Input
                        {...form.register('calibration_frequency')}
                        placeholder="e.g., 6"
                        type="number"
                        aria-label="calibration frequency"
                        className={editableFieldClassName}
                      />
                      <V3Select value={form.watch('calibration_frequency_unit') || 'months'} ariaLabel="calibration frequency unit" placeholder="Unit" onChange={(value) => form.setValue('calibration_frequency_unit', value as "days" | "months" | "years")} options={[{ value: "days", label: "Days" }, { value: "months", label: "Months" }, { value: "years", label: "Years" }]} />
                    </div>
                  </div>
                  <div>
                    <label className={fieldLabelClassName}>Gauge Condition *</label>
                    <Input
                      {...form.register('gauge_condition')}
                      placeholder="e.g., Good, Minor scratches"
                      aria-label="gauge condition"
                      className={editableFieldClassName}
                    />
                  </div>

                </div>
              </div>

              {/* Section 3: Calibration Details */}
              <div className={`mt-3 mb-3 ${sectionClassName}`}>
                <h2 className="mb-4 border-b border-slate-200 pb-2 text-base font-bold text-slate-900">
                  Calibration Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className={fieldLabelClassName}>Environmental Conditions</label>
                    <Input
                      {...form.register('environmental_conditions')}
                      // placeholder="e.g., Temp: 23°C ± 2°C, Humidity: 50% ± 10%"
                      aria-label="environmental conditions"
                      className={editableFieldClassName}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClassName}>Uncertainty Measurement</label>
                    <Input
                      {...form.register('uncertainty')}
                      placeholder="e.g., ±0.002 mm"
                      aria-label="uncertainty measurement"
                      className={editableFieldClassName}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClassName}>Calibration Method</label>
                    <Input
                      {...form.register('calibration_method')}
                      placeholder="e.g., Optical Comparator"
                      aria-label='calibration method'
                      className={editableFieldClassName}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClassName}>Calibration Location *</label>
                    <Input
                      {...form.register('calibration_location')}
                      placeholder="e.g., Laboratory, On-site"
                      aria-label='calibration location'
                      className={editableFieldClassName}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClassName}>Calibration Type *</label>
                    <V3Select value={form.watch('calibration_type') || 'fully'} ariaLabel="calibration type" placeholder="Select calibration type" onChange={(value) => form.setValue('calibration_type', value as 'fully' | 'partially')} options={[{ value: "fully", label: "Fully Calibrated" }, { value: "partially", label: "Partially Calibrated" }]} />
                  </div>

                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 mb-2">
                  <div>
                    <label className={fieldLabelClassName}>Conformity Statement with Decision Rule</label>
                    <TextArea
                      {...form.register('conformity_statement')}
                      placeholder="Enter conformity statement and decision rule applied"
                      aria-label='conformity statement'
                      rows={2}
                      className={editableFieldClassName}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClassName}>Remark</label>
                    <Controller
                      control={form.control}
                      name="remark"
                      render={({ field }) => (
                        <TagsInput
                          label={undefined}
                          placeholder="Add remark and press Enter"
                          value={field.value ?? []}
                          onChange={field.onChange}
                          // description="Press Enter or comma to add a remark"
                        />
                      )}
                    />
                  </div>
                </div>
                <EquipmentSelector
                  value={selectedEquipmentIds}
                  onChange={handleEquipmentChange}
                  loading={equipmentLoading}
                />

              </div>

              <GaugeSpecificationRenderer
                gaugeType={gaugeData?.certificate_type || ""}
                specifications={effectiveSpecifications}
                readOnly={isSpecificationSectionReadOnly}
                showCalculatedTable={false}
              />

              <GaugeTypeCalibrationRenderer
                certificate_type={gaugeData?.certificate_type || ""}
                onCancel={handleCancel}
                isReadOnly={isCalibrationCompleted && !isEditMode}
                observations={observations}
                specifications={effectiveSpecifications}
                master_readings={gaugeData?.master_readings || []}
                uncertainty={gaugeData?.uncertainty || ""}
              />
            </div>



            <div className="mt-6 border-t border-gray-200 p-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{readyTitle}</p>
                    <p className="text-xs text-gray-500">Review all readings before submission</p>
                  </div>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                      />
                    </svg>
                    Cancel
                  </Button>
                  {isPlatformSuperAdmin && (
                    <Button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => void form.handleSubmit((values) => handleSubmitCalibration(values, false))()}
                      className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {observationsOnlyButtonText}
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none px-8 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitButtonText}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </FormProvider>
      </div>
      </div>
      <Modal
        isOpen={isAttentionModalOpen}
        onClose={handleCloseAttentionModal}
        size="lg"
        title={isEditMode ? "Review Before Updating Certificate" : "Review Before Generating Certificate"}
        description={attentionModalDescription}
      >
        <div className="space-y-4 p-6">
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Attention required
              </p>
              <p className="mt-1 text-sm text-amber-800">
                These remarks suggest there may be manual entry issues or values outside acceptable limits.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-900">Detected remarks</p>
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {attentionWarnings.map((warning, index) => (
                <div
                  key={`${warning.path}-${warning.value}-${index}`}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {warning.path}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{warning.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={handleCloseAttentionModal}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Check Values Again
            </Button>
            <Button
              onClick={handleContinueAfterAttentionWarning}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
            >
              Continue {isEditMode ? "Update" : "Generate"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

NablCalibrationProcessPage.displayName = "NablCalibrationProcessPage";

export default NablCalibrationProcessPage;
