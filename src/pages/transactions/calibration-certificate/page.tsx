import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import {Input, DatePicker} from "@heroui-v2/react";
import { LinkedGaugesTable } from "../../../components/Tables/LinkedGaugesTable";
import { Select, SelectItem, Button, Tabs, Tab, Card, CardBody } from "@heroui-v2/react";
import { useInwardGaugeStore } from "../../../store/inwardGaugeStore";
import { useCertificateStore } from "../../../store/certificateStore";
import { toast } from "sonner";
import { CertificatePreviewModal } from "../../../components/certificate/CertificatePreviewModal";
import { logger } from "../../../utils/logger";
import { MagnifyingGlassIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import type { DateValue } from "@internationalized/date";
import { useNavigate } from "react-router-dom";
import { I18nProvider } from "@react-aria/i18n";
import { useLinkedGaugesWithFiltersQuery } from "../../../hooks/queries/linkedGauges";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../hooks/queries/queryKeys";
import { calendarDateToApi, apiToCalendarDate } from "../../../utils/dateAdapter";
import { useCalibrationCertificateFilterStore } from "../../../store/calibrationCertificateFilterStore";
import { useOrganizationsQuery } from "../../../hooks/queries/organizations";
import { useShallow } from "zustand/react/shallow";
import { useNavigation } from "../../../context/NavigationContext";
import { useAuth } from "../../../features/auth";
import { useDebounce } from "../../../hooks/useDebounce";
import { buildRegisterGaugeRoute } from "../../../utils/inwardRoutes";
import type { LinkedGauge } from "../../../types";

// Filter form data type for Pending Gauges Tab
interface PendingFilterFormData {
  clientFilter: string | null;
  dateFrom: DateValue | null;
  dateTo: DateValue | null;
  labIdFilter: string;
}

// Filter form data type for Completed Gauges Tab
interface CompletedFilterFormData {
  clientFilter: string | null;
  dateFrom: DateValue | null;
  dateTo: DateValue | null;
  labIdFilter: string;
}

function getCertificateId(record: unknown): string | undefined {
  if (!record || typeof record !== "object") return undefined;
  const maybeRecord = record as { certificate_id?: unknown };
  return typeof maybeRecord.certificate_id === "string" ? maybeRecord.certificate_id : undefined;
}

export default function LinkedGaugesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { startLoading } = useNavigation();
  const { user } = useAuth();

  // 🎯 Zustand Store - Single Source of Truth for Filters
  const {
    pendingFilters,
    completedFilters,
    activeTab,
    pendingPage,
    pendingRowsPerPage,
    completedPage,
    completedRowsPerPage,
    pendingSearchTerm,
    completedSearchTerm,
    setPendingFilters,
    setCompletedFilters,
    resetPendingFilters,
    resetCompletedFilters,
    setActiveTab,
    setPendingPage,
    setPendingRowsPerPage,
    setCompletedPage,
    setCompletedRowsPerPage,
    setPendingSearchTerm,
    setCompletedSearchTerm,
  } = useCalibrationCertificateFilterStore(
    useShallow((state) => ({
      pendingFilters: state.pendingFilters,
      completedFilters: state.completedFilters,
      activeTab: state.activeTab,
      pendingPage: state.pendingPage,
      pendingRowsPerPage: state.pendingRowsPerPage,
      completedPage: state.completedPage,
      completedRowsPerPage: state.completedRowsPerPage,
      pendingSearchTerm: state.pendingSearchTerm,
      completedSearchTerm: state.completedSearchTerm,
      setPendingFilters: state.setPendingFilters,
      setCompletedFilters: state.setCompletedFilters,
      resetPendingFilters: state.resetPendingFilters,
      resetCompletedFilters: state.resetCompletedFilters,
      setActiveTab: state.setActiveTab,
      setPendingPage: state.setPendingPage,
      setPendingRowsPerPage: state.setPendingRowsPerPage,
      setCompletedPage: state.setCompletedPage,
      setCompletedRowsPerPage: state.setCompletedRowsPerPage,
      setPendingSearchTerm: state.setPendingSearchTerm,
      setCompletedSearchTerm: state.setCompletedSearchTerm,
    })),
  );

  const pendingDefaults = useMemo(
    () => ({
      clientFilter: pendingFilters.client_org_id || null,
      dateFrom: apiToCalendarDate(pendingFilters.inward_date_from),
      dateTo: apiToCalendarDate(pendingFilters.inward_date_to),
      labIdFilter: pendingFilters.lab_id || "",
    }),
    [
      pendingFilters.client_org_id,
      pendingFilters.inward_date_from,
      pendingFilters.inward_date_to,
      pendingFilters.lab_id,
    ],
  );

  const completedDefaults = useMemo(
    () => ({
      clientFilter: completedFilters.client_org_id || null,
      dateFrom: apiToCalendarDate(completedFilters.inward_date_from),
      dateTo: apiToCalendarDate(completedFilters.inward_date_to),
      labIdFilter: completedFilters.lab_id || "",
    }),
    [
      completedFilters.client_org_id,
      completedFilters.inward_date_from,
      completedFilters.inward_date_to,
      completedFilters.lab_id,
    ],
  );

  // Pending Gauges Tab Form - Initialized from Zustand store
  const pendingForm = useForm<PendingFilterFormData>({
    defaultValues: pendingDefaults,
    mode: "onChange",
  });

  // Completed Gauges Tab Form - Initialized from Zustand store
  const completedForm = useForm<CompletedFilterFormData>({
    defaultValues: completedDefaults,
    mode: "onChange",
  });

  // 🔄 Hydrate Pending Form from Zustand Store (when store changes)
  const lastPendingDefaultsKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = JSON.stringify({
      clientFilter: pendingDefaults.clientFilter,
      dateFrom: pendingDefaults.dateFrom?.toString() ?? null,
      dateTo: pendingDefaults.dateTo?.toString() ?? null,
      labIdFilter: pendingDefaults.labIdFilter,
    });
    if (lastPendingDefaultsKeyRef.current === key) return;
    lastPendingDefaultsKeyRef.current = key;
    pendingForm.reset(pendingDefaults, { keepDefaultValues: false });
  }, [pendingDefaults, pendingForm]);

  // Certificate store hook (select only what we need to avoid store-wide re-renders)
  const {
    getCertificate,
    previewModal,
    openPreviewModal,
    updatePreviewModal,
    closePreviewModal,
  } = useCertificateStore(
    useShallow((state) => ({
      getCertificate: state.getCertificate,
      previewModal: state.previewModal,
      openPreviewModal: state.openPreviewModal,
      updatePreviewModal: state.updatePreviewModal,
      closePreviewModal: state.closePreviewModal,
    }))
  );

  // 🔄 Hydrate Completed Form from Zustand Store (when store changes)
  const lastCompletedDefaultsKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = JSON.stringify({
      clientFilter: completedDefaults.clientFilter,
      dateFrom: completedDefaults.dateFrom?.toString() ?? null,
      dateTo: completedDefaults.dateTo?.toString() ?? null,
      labIdFilter: completedDefaults.labIdFilter,
    });
    if (lastCompletedDefaultsKeyRef.current === key) return;
    lastCompletedDefaultsKeyRef.current = key;
    completedForm.reset(completedDefaults, { keepDefaultValues: false });
  }, [completedDefaults, completedForm]);

  const {
    FetchInwardedGaugeByGaugeIdAndInwardId,
    deleteInwardGaugeFromState,
    clearError,
  } = useInwardGaugeStore(
    useShallow((state) => ({
      FetchInwardedGaugeByGaugeIdAndInwardId: state.FetchInwardedGaugeByGaugeIdAndInwardId,
      deleteInwardGaugeFromState: state.deleteInwardGaugeFromState,
      clearError: state.clearError,
    }))
  );

  const organizationsQuery = useOrganizationsQuery({
    directory: 'customers',
    enabled: Boolean(user?.organization_id),
  });
  const organizations = organizationsQuery.data?.organizations ?? [];
  const organizationsLoading = organizationsQuery.isPending;
  const [pendingSearchTriggered, setPendingSearchTriggered] = useState(false);
  const [completedSearchTriggered, setCompletedSearchTriggered] = useState(false);
  const debouncedPendingTableSearch = useDebounce(pendingSearchTerm.trim(), 400);
  const debouncedCompletedTableSearch = useDebounce(completedSearchTerm.trim(), 400);

  const pendingQueryFilters = useMemo(
    () => ({
      ...pendingFilters,
      search: debouncedPendingTableSearch || undefined,
    }),
    [debouncedPendingTableSearch, pendingFilters]
  );

  const completedQueryFilters = useMemo(
    () => ({
      ...completedFilters,
      search: debouncedCompletedTableSearch || undefined,
    }),
    [completedFilters, debouncedCompletedTableSearch]
  );

  // Fetch data separately for each tab with status filter
  // Pending gauges - with status filter "inward_received"
  const pendingQuery = useLinkedGaugesWithFiltersQuery(pendingQueryFilters, {
    enabled: activeTab === "new-certificate" && Boolean(user?.organization_id),
    page: Math.max(pendingPage - 1, 0),
    limit: pendingRowsPerPage,
  });

  // Completed gauges - with status filter "calibration_completed"
  const completedQuery = useLinkedGaugesWithFiltersQuery(completedQueryFilters, {
    enabled: activeTab === "view-certificate" && Boolean(user?.organization_id),
    page: Math.max(completedPage - 1, 0),
    limit: completedRowsPerPage,
  });
  // Data is already filtered by status on the backend, no need to filter again
  const pendingGauges = useMemo(() => pendingQuery.data?.items ?? [], [pendingQuery.data]);
  const completedGauges = useMemo(() => completedQuery.data?.items ?? [], [completedQuery.data]);
  const [pendingPaginationMeta, setPendingPaginationMeta] = useState({ total: 0, totalPages: 1 });
  const [completedPaginationMeta, setCompletedPaginationMeta] = useState({ total: 0, totalPages: 1 });
  const pendingTableLoading = pendingQuery.isPending || pendingQuery.isFetching;
  const completedTableLoading = completedQuery.isPending || completedQuery.isFetching;
  const pendingSearchLoading = pendingSearchTriggered && pendingQuery.isFetching;
  const completedSearchLoading = completedSearchTriggered && completedQuery.isFetching;

  useEffect(() => {
    if (pendingQuery.data) {
      setPendingPaginationMeta({
        total: pendingQuery.data.total ?? 0,
        totalPages: Math.max(pendingQuery.data.totalPages ?? 1, 1),
      });
    }
  }, [pendingQuery.data]);

  useEffect(() => {
    if (completedQuery.data) {
      setCompletedPaginationMeta({
        total: completedQuery.data.total ?? 0,
        totalPages: Math.max(completedQuery.data.totalPages ?? 1, 1),
      });
    }
  }, [completedQuery.data]);

  const handleEditGauge = useCallback(
    (gaugeId: string) => {
      // Find the gauge from the current list
      const gauge = completedGauges.find((g) => g.gauge_id === gaugeId || g.id === gaugeId);
      if (!gauge) {
        toast.error("Gauge not found");
        return;
      }
      // Navigate to NABL calibration page for editing (same as create flow)
      const targetPath = `/transactions/calibration-certificate/nabl-process/${gauge.inward_id}/${gauge.gauge_id || gaugeId}`;
      startLoading(targetPath);
      navigate(targetPath, { state: { isEdit: true } });
    },
    [navigate, completedGauges, startLoading]
  );

  const handleDeleteGauge = useCallback(
    async (inwardId: string, gaugeId: string) => {
      try {
        await deleteInwardGaugeFromState(inwardId, gaugeId);
        toast.success("Gauge deleted");
        await queryClient.invalidateQueries({ queryKey: queryKeys.gauges.lists() });
      } catch (error) {
        logger.error("Failed to delete gauge:", error);
        toast.error("Failed to delete gauge. Please try again.");
        throw error;
      }
    },
    [deleteInwardGaugeFromState, queryClient]
  );

  const handleNablCalibration = useCallback(
    (gauge: LinkedGauge) => {
      const targetPath = `/transactions/calibration-certificate/nabl-process/${gauge.inward_id}/${gauge.gauge_id}`;
      startLoading(targetPath);
      navigate(targetPath);
    },
    [navigate, startLoading]
  );

  const handleInwardNoClick = useCallback(
    (gauge: LinkedGauge) => {
      const gaugeWithClient = gauge as LinkedGauge & { client_org_id?: string };
      const clientOrgId = gaugeWithClient.client_org_id;
      const clientOrgName = gauge.client_org_name || "-";
      const inwardDate = gauge.inward_date || new Date().toISOString();
      const inwardNo = gauge.inward_no?.toString() || "0";

      const targetPath = buildRegisterGaugeRoute({
        inwardId: gauge.inward_id,
        clientOrgId,
        inwardNo,
        clientOrgName,
        inwardDate,
      });
      startLoading(targetPath);
      navigate(targetPath);
    },
    [navigate, startLoading]
  );

  /* -------------------- Search Handler for PENDING TAB -------------------- */
  const handlePendingSearch = useCallback((data: PendingFilterFormData) => {
    setPendingSearchTriggered(true);
    setPendingPage(1);
    // Convert DateValue to DD-MM-YYYY format for API
    const dateFromApi = calendarDateToApi(data.dateFrom);
    const dateToApi = calendarDateToApi(data.dateTo);

    // Update Zustand store - maintain default status filter
    setPendingFilters({
      status: 'inward_received', // Always include default status
      client_org_id: data.clientFilter || undefined,
      lab_id: data.labIdFilter?.trim() || undefined,
      inward_date_from: dateFromApi,
      inward_date_to: dateToApi,
    });
  }, [setPendingFilters, setPendingPage]);

  /* -------------------- Search Handler for COMPLETED TAB -------------------- */
  const handleCompletedSearch = useCallback((data: CompletedFilterFormData) => {
    setCompletedSearchTriggered(true);
    setCompletedPage(1);
    // Convert DateValue to DD-MM-YYYY format for API
    const dateFromApi = calendarDateToApi(data.dateFrom);
    const dateToApi = calendarDateToApi(data.dateTo);

    // Update Zustand store - maintain default status filter
    setCompletedFilters({
      status: 'calibration_completed', // Always include default status
      client_org_id: data.clientFilter || undefined,
      lab_id: data.labIdFilter?.trim() || undefined,
      inward_date_from: dateFromApi,
      inward_date_to: dateToApi,
    });
  }, [setCompletedFilters, setCompletedPage]);

  /* -------------------- Reset Handlers -------------------- */
  const handlePendingReset = useCallback(() => {
    setPendingSearchTriggered(false);
    setPendingPage(1);
    setPendingSearchTerm("");
    // Reset Zustand store to default filters (includes default status)
    resetPendingFilters();
    // Reset form to empty values (status is handled by store)
    pendingForm.reset({
      clientFilter: null,
      dateFrom: null,
      dateTo: null,
      labIdFilter: "",
    });
  }, [pendingForm, resetPendingFilters, setPendingPage, setPendingSearchTerm]);

  const handleCompletedReset = useCallback(() => {
    setCompletedSearchTriggered(false);
    setCompletedPage(1);
    setCompletedSearchTerm("");
    // Reset Zustand store to default filters (includes default status)
    resetCompletedFilters();
    // Reset form to empty values (status is handled by store)
    completedForm.reset({
      clientFilter: null,
      dateFrom: null,
      dateTo: null,
      labIdFilter: "",
    });
  }, [completedForm, resetCompletedFilters, setCompletedPage, setCompletedSearchTerm]);

  /* -------------------- Refresh Handlers -------------------- */
  const handlePendingRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.gauges.lists(),
      refetchType: "none",
    });
    await pendingQuery.refetch();
  }, [pendingQuery, queryClient]);

  const handleCompletedRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.gauges.lists(),
      refetchType: "none",
    });
    await completedQuery.refetch();
  }, [completedQuery, queryClient]);

  /* -------------------- CERTIFICATE HANDLER -------------------- */
  const handleCertificateClick = useCallback(
    async (inwardId: string, gaugeId: string) => {
      try {
        openPreviewModal({
          certificateUrl: null,
          isLoading: true,
          loadingText: "Preparing certificate preview...",
        });

        const gaugeData = await FetchInwardedGaugeByGaugeIdAndInwardId(inwardId, gaugeId, true);
        if (!gaugeData) {
          toast.error('Failed to load gauge data');
          closePreviewModal();
          return;
        }

        const certificateId = getCertificateId(gaugeData);

        if (!certificateId) {
          toast.error('Certificate not found for this gauge');
          closePreviewModal();
          return;
        }

        const certificate = await getCertificate(certificateId);
        if (certificate) {
          const gaugeName = String(gaugeData.master_gauge_name || gaugeData.gauge_name || 'Gauge');
          const labId = String(gaugeData.inward_gauge_lab_id || 'Lab');
          updatePreviewModal({
            certificateUrl: certificate.certificateUrl ?? null,
            fileName: `${gaugeName}_${labId}`,
            isLoading: false,
            loadingText: certificate.certificateUrl
              ? "Rendering certificate preview..."
              : "Loading certificate...",
          });
        } else {
          toast.error('Certificate URL not found');
          closePreviewModal();
        }
      } catch (err) {
        logger.error('Error fetching certificate data:', err);
        toast.error('Failed to load certificate data. Please try again.');
        closePreviewModal();
      }
    },
    [
      FetchInwardedGaugeByGaugeIdAndInwardId,
      getCertificate,
      openPreviewModal,
      updatePreviewModal,
      closePreviewModal,
    ]
  );
console.log('completedGauges',completedGauges);
console.log('pendingGauges',pendingGauges);

  const handleCloseCertificateModal = useCallback(() => {
    closePreviewModal();
  }, [closePreviewModal]);

  // End search-button loading as soon as the corresponding query settles.
  useEffect(() => {
    if (pendingSearchTriggered && !pendingQuery.isFetching) {
      setPendingSearchTriggered(false);
    }
  }, [pendingSearchTriggered, pendingQuery.isFetching]);

  useEffect(() => {
    if (completedSearchTriggered && !completedQuery.isFetching) {
      setCompletedSearchTriggered(false);
    }
  }, [completedSearchTriggered, completedQuery.isFetching]);

  /* -------------------- CLEANUP -------------------- */
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const hasLaboratoryContext = Boolean(user?.organization_id);

  const handlePendingTableSearchChange = useCallback((value: string) => {
    setPendingSearchTerm(value);
  }, [setPendingSearchTerm]);

  const handleCompletedTableSearchChange = useCallback((value: string) => {
    setCompletedSearchTerm(value);
  }, [setCompletedSearchTerm]);

  return (
    <I18nProvider locale="en-GB">
    <div className="mt-4">
      {hasLaboratoryContext ? <>
      <Tabs 
        aria-label="Certificate Management" 
        selectedKey={activeTab} 
        onSelectionChange={(key) => setActiveTab(key as "new-certificate" | "view-certificate")}
        color="primary"
        variant="bordered"
        classNames={{
          tabList: "gap-4 w-full relative rounded-lg p-1 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 shadow-sm border border-slate-200 dark:border-slate-700",
          cursor: "w-full shadow-md",
          tab: "h-10 font-semibold transition-all",
          tabContent: "group-data-[selected=true]:text-white"
        }}
      >
        <Tab 
          key="new-certificate" 
          title={
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>New Certificate</span>
            </div>
          }
          className="data-[selected=true]:bg-primary data-[selected=true]:text-white"
        >
          <Card className="shadow-lg border border-slate-200 dark:border-slate-700">
            <CardBody className="p-0">
              <LinkedGaugesTable
                data={pendingGauges}
                loading={pendingTableLoading}
                onCertificate={handleCertificateClick}
                isViewCertificateTab={false}
                onNablCalibration={handleNablCalibration}
                onInwardNoClick={handleInwardNoClick}
                page={pendingPage}
                rowsPerPage={pendingRowsPerPage}
                totalItems={pendingQuery.data?.total ?? pendingPaginationMeta.total}
                totalPages={pendingQuery.data?.totalPages ?? pendingPaginationMeta.totalPages}
                isServerPagination
                onPageChange={setPendingPage}
                onRowsPerPageChange={setPendingRowsPerPage}
                searchValue={pendingSearchTerm}
                onSearchValueChange={handlePendingTableSearchChange}
                // onNonNablCalibration={handleNonNablCalibration}
                filters={
                  <form onSubmit={pendingForm.handleSubmit(handlePendingSearch)} className="mb-2 space-y-3">
                    {/* Row 1: Company Name and Lab ID (2 columns) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Client Filter */}
                      <Controller
                        name="clientFilter"
                        control={pendingForm.control}
                        render={({ field }) => (
                          <Select
                            placeholder={organizationsLoading ? "Loading clients..." : "All Clients"}
                            selectedKeys={field.value ? [field.value] : []}
                            onSelectionChange={(keys) => {
                              const selectedValue = Array.from(keys)[0] as string | undefined;
                              field.onChange(selectedValue || null);
                            }}
                            isLoading={organizationsLoading}
                            isDisabled={organizationsLoading}
                            classNames={{
                              base: "w-full",
                              trigger: "h-9 border border-gray-300 bg-white hover:border-gray-400 focus-within:border-blue-500 text-sm"
                            }}
                            aria-label="Select client organization"
                          >
                            {organizations.map(org => (
                              <SelectItem key={org.id} textValue={org.name}>
                                {org.name}
                              </SelectItem>
                            ))}
                          </Select>
                        )}
                      />

                      {/* Lab ID Filter */}
                      <Controller
                        name="labIdFilter"
                        control={pendingForm.control}
                        render={({ field }) => (
                          <Input
                            placeholder="Enter Lab ID..."
                            aria-label="Enter Lab ID..."
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value)}
                            classNames={{
                              inputWrapper: "h-9 border-gray-300 border hover:border-gray-400 focus-within:border-blue-500 bg-white"
                            }}
                          />
                        )}
                      />
                    </div>

                    {/* Row 2: Date Range and Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Date From Filter */}
                      <Controller
                        name="dateFrom"
                        control={pendingForm.control}
                        render={({ field }) => (
                          <DatePicker
                            value={field.value || undefined}
                            aria-label="Select date from..."
                            onChange={field.onChange}
                            granularity="day"
                            showMonthAndYearPickers
                            classNames={{
                              base: "w-full",
                              inputWrapper: "h-9 border border-gray-300 bg-white hover:border-gray-400 focus-within:border-blue-500 min-h-[36px]"
                            }}
                          />
                        )}
                      />

                      {/* Date To Filter */}
                      <Controller
                        name="dateTo"
                        control={pendingForm.control}
                        render={({ field }) => (
                          <DatePicker
                            value={field.value || undefined}
                            aria-label="Select date to..."
                            onChange={field.onChange}
                            granularity="day"
                            showMonthAndYearPickers
                            classNames={{
                              base: "w-full",
                              inputWrapper: "h-9 border border-gray-300 bg-white hover:border-gray-400 focus-within:border-blue-500 min-h-[36px]"
                            }}
                          />
                        )}
                      />

                      {/* Buttons Column */}
                      <div className="flex items-end gap-2 lg:col-span-2">
                        <Button
                          type="submit"
                          color="primary"
                          aria-label="Search pending gauges..."
                          size="sm"
                          isLoading={pendingSearchLoading}
                          startContent={!pendingSearchLoading && <MagnifyingGlassIcon className="w-4 h-4" />}
                          className="flex-1"
                        >
                          {pendingSearchLoading ? "Searching..." : "Search"}
                        </Button>
                        <Button
                          type="button"
                          aria-label="Reset pending gauges..."
                          variant="flat"
                          size="sm"
                          onPress={handlePendingReset}
                          startContent={<ArrowPathIcon className="w-4 h-4" />}
                          className="flex-1"
                        >
                          Reset
                        </Button>
                        <Button
                          type="button"
                          aria-label="Refresh pending gauges..."
                          variant="bordered"
                          size="sm"
                          onPress={handlePendingRefresh}
                          isLoading={pendingQuery.isRefetching}
                          startContent={!pendingQuery.isRefetching && <ArrowPathIcon className="w-4 h-4" />}
                          className="flex-1"
                        >
                          {pendingQuery.isRefetching ? "Refreshing..." : "Refresh"}
                        </Button>
                      </div>
                    </div>
                    {/* Empty State Message */}
                    {pendingGauges.length === 0 && !pendingQuery.isPending && !pendingQuery.isFetching && (
                      <div className="text-center py-8 text-gray-500">
                        No gauges found matching your filters. Please try different search criteria.
                      </div>
                    )}
                  </form>
                }
              />
            </CardBody>
          </Card>
        </Tab>
        <Tab 
          key="view-certificate" 
          title={
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>View Certificate</span>
            </div>
          }
          className="data-[selected=true]:bg-warning data-[selected=true]:text-white"
        >
          <Card className="shadow-lg border border-slate-200 dark:border-slate-700">
            <CardBody className="p-0">
              <LinkedGaugesTable
                data={completedGauges}
                loading={completedTableLoading}
                onEdit={handleEditGauge}
                onDelete={handleDeleteGauge}
                onCertificate={handleCertificateClick}
                isViewCertificateTab={true}
                onInwardNoClick={handleInwardNoClick}
                page={completedPage}
                rowsPerPage={completedRowsPerPage}
                totalItems={completedQuery.data?.total ?? completedPaginationMeta.total}
                totalPages={completedQuery.data?.totalPages ?? completedPaginationMeta.totalPages}
                isServerPagination
                onPageChange={setCompletedPage}
                onRowsPerPageChange={setCompletedRowsPerPage}
                searchValue={completedSearchTerm}
                onSearchValueChange={handleCompletedTableSearchChange}
                filters={
                  <form onSubmit={completedForm.handleSubmit(handleCompletedSearch)} className="mb-2 space-y-3">
                    {/* Row 1: Company Name and Lab ID (2 columns) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Client Filter */}
                      <Controller
                        name="clientFilter"
                        control={completedForm.control}
                        render={({ field }) => (
                          <Select
                            placeholder={organizationsLoading ? "Loading clients..." : "All Clients"}
                            selectedKeys={field.value ? [field.value] : []}
                            onSelectionChange={(keys) => {
                              const selectedValue = Array.from(keys)[0] as string | undefined;
                              field.onChange(selectedValue || null);
                            }}
                            isLoading={organizationsLoading}
                            isDisabled={organizationsLoading}
                            classNames={{
                              base: "w-full",
                              trigger: "h-9 border border-gray-300 bg-white hover:border-gray-400 focus-within:border-blue-500 text-sm"
                            }}
                            aria-label="Select client organization"
                          >
                            {organizations.map(org => (
                              <SelectItem key={org.id} textValue={org.name}>
                                {org.name}
                              </SelectItem>
                            ))}
                          </Select>
                        )}
                      />

                      {/* Lab ID Filter */}
                      <Controller
                        name="labIdFilter"
                        control={completedForm.control}
                        render={({ field }) => (
                          <Input
                            placeholder="Enter Lab ID..."
                            aria-label="Enter Lab ID..."
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value)}
                            classNames={{
                              inputWrapper: "h-9 border-gray-300 border hover:border-gray-400 focus-within:border-blue-500 bg-white"
                            }}
                          />
                        )}
                      />
                    </div>

                    {/* Row 2: Date Range and Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Date From Filter */}
                      <Controller
                        name="dateFrom"
                        control={completedForm.control}
                        render={({ field }) => (
                          <DatePicker
                            value={field.value || undefined}
                            aria-label="Select date from..."
                            onChange={field.onChange}
                            granularity="day"
                            showMonthAndYearPickers
                            classNames={{
                              base: "w-full",
                              inputWrapper: "h-9 border border-gray-300 bg-white hover:border-gray-400 focus-within:border-blue-500 min-h-[36px]"
                            }}
                          />
                        )}
                      />

                      {/* Date To Filter */}
                      <Controller
                        name="dateTo"
                        control={completedForm.control}
                        render={({ field }) => (
                          <DatePicker
                            value={field.value || undefined}
                            aria-label="Select date to..."
                            onChange={field.onChange}
                            granularity="day"
                            showMonthAndYearPickers
                            classNames={{
                              base: "w-full",
                              inputWrapper: "h-9 border border-gray-300 bg-white hover:border-gray-400 focus-within:border-blue-500 min-h-[36px]"
                            }}
                          />
                        )}
                      />

                      {/* Buttons Column */}
                      <div className="flex items-end gap-2 lg:col-span-2">
                        <Button
                          type="submit"
                          color="primary"
                          aria-label="Search completed gauges..."
                          size="sm"
                          isLoading={completedSearchLoading}
                          startContent={!completedSearchLoading && <MagnifyingGlassIcon className="w-4 h-4" />}
                          className="flex-1"
                        >
                          {completedSearchLoading ? "Searching..." : "Search"}
                        </Button>
                        <Button
                          type="button"
                          variant="flat"
                          aria-label="Reset completed gauges..."
                          size="sm"
                          onPress={handleCompletedReset}
                          startContent={<ArrowPathIcon className="w-4 h-4" />}
                          className="flex-1"
                        >
                          Reset
                        </Button>
                        <Button
                          type="button"
                          variant="bordered"
                          aria-label="Refresh completed gauges..."
                          size="sm"
                          onPress={handleCompletedRefresh}
                          isLoading={completedQuery.isRefetching}
                          startContent={!completedQuery.isRefetching && <ArrowPathIcon className="w-4 h-4" />}
                          className="flex-1"
                        >
                          {completedQuery.isRefetching ? "Refreshing..." : "Refresh"}
                        </Button>
                      </div>
                    </div>
                  </form>
                }
              />
            </CardBody>
          </Card>
        </Tab>

      </Tabs>
      </> : (
        <div className="flex min-h-48 items-center justify-center rounded-md border border-amber-200 bg-amber-50 px-6 text-center text-sm font-medium text-amber-800">
          Select a laboratory to view and manage calibration certificates.
        </div>
      )}
      
      {/* Modals */}
      {/* Certificate Preview Modal */}
      <CertificatePreviewModal
        isOpen={previewModal.isOpen}
        onClose={handleCloseCertificateModal}
        certificateUrl={previewModal.certificateUrl}
        fileName={previewModal.fileName}
        isLoading={previewModal.isLoading}
        loadingText={previewModal.loadingText}
      />
    </div>
    </I18nProvider>
  );
}
