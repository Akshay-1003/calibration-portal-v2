import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { Calendar, DateField, DatePicker, Input, ListBox, Select, Button, Tabs, Card } from "@heroui/react";
import { LinkedGaugesTable } from "../../../components/Tables/LinkedGaugesTable";
import { useInwardGaugeStore } from "../../../store/inwardGaugeStore";
import { useCertificateStore } from "../../../store/certificateStore";
import { toast } from "sonner";
import { CertificatePreviewModal } from "../../../components/certificate/CertificatePreviewModal";
import { logger } from "../../../utils/logger";
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

const OrganizationSelect = ({ value, onChange, loading, organizations }: { value: string | null; onChange: (value: string | null) => void; loading: boolean; organizations: Array<{ id: string; name: string }> }) => (
  <Select selectedKey={value || null} onSelectionChange={(key) => onChange(key ? String(key) : null)} isDisabled={loading} placeholder={loading ? "Loading clients..." : "All Clients"} aria-label="Select client organization">
    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
    <Select.Popover><ListBox>{organizations.map((org) => <ListBox.Item key={org.id} id={org.id} textValue={org.name}>{org.name}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
  </Select>
);

const FilterDatePicker = ({ value, onChange, label }: { value: DateValue | null; onChange: (value: DateValue | null) => void; label: string }) => (
  <DatePicker value={value} onChange={onChange} aria-label={label}>
    <DateField.Group fullWidth><DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input><DateField.Suffix><DatePicker.Trigger><DatePicker.TriggerIndicator /></DatePicker.Trigger></DateField.Suffix></DateField.Group>
    <DatePicker.Popover><Calendar aria-label={label}><Calendar.Header><Calendar.NavButton slot="previous" /><Calendar.Heading /><Calendar.NavButton slot="next" /></Calendar.Header><Calendar.Grid><Calendar.GridHeader>{(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}</Calendar.GridHeader><Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody></Calendar.Grid></Calendar></DatePicker.Popover>
  </DatePicker>
);

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
  const listClassName = "rounded-xl border border-slate-200 bg-slate-100/80 p-1 shadow-sm";
  const tabClassName = "rounded-lg px-5 py-2.5 font-semibold opacity-100 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 data-[hovered=true]:not-data-[selected=true]:bg-white data-[pressed=true]:not-data-[selected=true]:bg-white";
  return (
    <I18nProvider locale="en-GB">
      <div className="mt-4">
        {hasLaboratoryContext ? <>
          <Tabs aria-label="Certificate Management" selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as "new-certificate" | "view-certificate")} variant="secondary">
            <Tabs.ListContainer className="rounded-none bg-transparent w-80">
              <Tabs.List aria-label="Certificate Management" className={listClassName}>
                <Tabs.Tab
                  id="new-certificate"
                  className={`${tabClassName} text-blue-700 data-[selected=true]:bg-blue-600 data-[selected=true]:text-white data-[selected=true]:shadow-sm`}
                >
                  New Certificate
                </Tabs.Tab>
                <Tabs.Tab
                  id="view-certificate"
                  className={`${tabClassName} text-orange-500 data-[selected=true]:bg-orange-400 data-[selected=true]:text-white data-[selected=true]:shadow-sm`}
                >
                  View Certificate
                </Tabs.Tab>
              </Tabs.List >
            </Tabs.ListContainer>
            <Tabs.Panel id="new-certificate">
              <Card className="shadow-lg border border-slate-200 dark:border-slate-700">
                <Card.Content className="p-0">
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
                              <OrganizationSelect value={field.value} onChange={field.onChange} loading={organizationsLoading} organizations={organizations} />
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
                              <FilterDatePicker value={field.value} onChange={field.onChange} label="Select date from" />
                            )}
                          />

                          {/* Date To Filter */}
                          <Controller
                            name="dateTo"
                            control={pendingForm.control}
                            render={({ field }) => (
                              <FilterDatePicker value={field.value} onChange={field.onChange} label="Select date to" />
                            )}
                          />

                          {/* Buttons Column */}
                          <div className="flex items-end gap-2 lg:col-span-2">
                            <Button
                              type="submit"
                              variant="primary"
                              aria-label="Search pending gauges..."
                              size="sm"
                              isDisabled={pendingSearchLoading}
                              className="flex-1"
                            >
                              {pendingSearchLoading ? "Searching..." : "Search"}
                            </Button>
                            <Button
                              type="button"
                              aria-label="Reset pending gauges..."
                              variant="secondary"
                              size="sm"
                              onPress={handlePendingReset}
                              className="flex-1"
                            >
                              Reset
                            </Button>
                            <Button
                              type="button"
                              aria-label="Refresh pending gauges..."
                              variant="outline"
                              size="sm"
                              onPress={handlePendingRefresh}
                              isDisabled={pendingQuery.isRefetching}
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
                </Card.Content>
              </Card>
            </Tabs.Panel>
            <Tabs.Panel id="view-certificate">
              <Card className="shadow-lg border border-slate-200 dark:border-slate-700">
                <Card.Content className="p-0">
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
                              <OrganizationSelect value={field.value} onChange={field.onChange} loading={organizationsLoading} organizations={organizations} />
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
                              <FilterDatePicker value={field.value} onChange={field.onChange} label="Select date from" />
                            )}
                          />

                          {/* Date To Filter */}
                          <Controller
                            name="dateTo"
                            control={completedForm.control}
                            render={({ field }) => (
                              <FilterDatePicker value={field.value} onChange={field.onChange} label="Select date to" />
                            )}
                          />

                          {/* Buttons Column */}
                          <div className="flex items-end gap-2 lg:col-span-2">
                            <Button
                              type="submit"
                              variant="primary"
                              aria-label="Search completed gauges..."
                              size="sm"
                              isDisabled={completedSearchLoading}
                              className="flex-1"
                            >
                              {completedSearchLoading ? "Searching..." : "Search"}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              aria-label="Reset completed gauges..."
                              size="sm"
                              onPress={handleCompletedReset}
                              className="flex-1"
                            >
                              Reset
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              aria-label="Refresh completed gauges..."
                              size="sm"
                              onPress={handleCompletedRefresh}
                              isDisabled={completedQuery.isRefetching}
                              className="flex-1"
                            >
                              {completedQuery.isRefetching ? "Refreshing..." : "Refresh"}
                            </Button>
                          </div>
                        </div>
                      </form>
                    }
                  />
                </Card.Content>
              </Card>
            </Tabs.Panel>
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
