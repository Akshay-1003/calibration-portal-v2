
import { useNavigate, useLocation } from "react-router";
import React, { useCallback, useEffect, useState } from "react";
import type { ClientData } from "../../../hooks/useInwardTableController";
import { TablePageWrapper } from "../../../components/layout/TablePageWrapper";
import { Button } from "../../../components/ui/button";
import { PlusIcon } from "@heroicons/react/24/solid";
import { useOrganizationsQuery } from "../../../hooks/queries/organizations";
import { useInwardGaugeStore } from "../../../store/inwardGaugeStore";
import { transformInwardToChalanData } from "../../../components/chalan/inwardChalanUtils";
import { printInwardChalan } from "../../../utils/inwardChalanPrint";
import type { InwardEntry } from "../../../types";
import { toast } from "sonner";
import { logger } from "../../../utils/logger";
import { useInwardTableController } from "../../../hooks/useInwardTableController";
import { InwardTable } from "../../../components/Tables/InwardTable";
import { DeleteConfirmModal } from "../../../components/common/DeleteConfirmModal";
import { useInwardEntriesListQuery, useDeleteInwardEntryMutation } from "../../../hooks/queries/inwards";
import { usePermissionAccess } from "../../../features/auth";
import { useAuth } from "../../../features/auth";

const InwardPage = React.memo(() => {
  const { canEdit } = usePermissionAccess();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin" || user?.role === "superadmin";
  const hasLaboratoryAccess = Boolean(user?.organization_id) || isSuperAdmin;
  const canManageInward = canEdit("inward");
  const navigate = useNavigate();
  const location = useLocation();
  const organizationsQuery = useOrganizationsQuery({
    directory: 'customers',
    enabled: hasLaboratoryAccess,
  });
  const organizations = organizationsQuery.data?.organizations ?? [];
  const organizationsLoading = organizationsQuery.isPending;

  // Inward gauge store for fetching linked gauges
  const {
    fetchAllCurrentInwardedGaugesForPrint,
  } = useInwardGaugeStore();

  // Organizations are fetched via React Query cache

  // ==========================================
  // ACTION HANDLERS (defined before controller to avoid dependency issues)
  // ==========================================

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ClientData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteMutation = useDeleteInwardEntryMutation();

  // Handle refresh - placeholder, will be updated after query
  const handleRefreshRef = React.useRef<() => void>(() => { });

  const handleDelete = useCallback((inward: ClientData) => {
    setPendingDelete(inward);
    setDeleteOpen(true);
  }, []);

  const closeDelete = useCallback(() => {
    if (isDeleting) return;
    setDeleteOpen(false);
    setPendingDelete(null);
  }, [isDeleting]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      setDeleteOpen(false);
      setPendingDelete(null);
    } catch (error) {
      logger.error('Error deleting inward entry:', error);
      throw error;
    } finally {
      setIsDeleting(false);
    }
  }, [deleteMutation, pendingDelete]);

  // Handle print inward chalan - directly opens print window
  const handlePrintChalan = useCallback(async (inward: InwardEntry | ClientData) => {
    if (!inward.id) {
      toast.error("Invalid inward entry");
      return;
    }

    try {
      // Fetch all inwarded gauges for this inward ID
      const linkedGauges = await fetchAllCurrentInwardedGaugesForPrint(inward.id, true);

      if (!linkedGauges || linkedGauges.length === 0) {
        toast.error("No gauges found for this inward entry");
        return;
      }

      // Transform data to chalan format - cast to InwardEntry as ClientData is a subset
      const transformedData = transformInwardToChalanData(
        inward as InwardEntry,
        linkedGauges,
        undefined,
        organizations
      );

      // Directly open print window
      printInwardChalan(transformedData);
    } catch (error) {
      logger.error("Error preparing chalan data:", error);
      toast.error("Failed to prepare chalan data");
    }
  }, [fetchAllCurrentInwardedGaugesForPrint, organizations]);

  // Handle edit
  const handleEdit = useCallback((inward: InwardEntry | ClientData) => {
    const returnTo = `${location.pathname}${location.search}`;
    navigate(`/transactions/inward/edit/${inward.id}?returnTo=${encodeURIComponent(returnTo)}`);
  }, [navigate, location.pathname, location.search]);

  // Handle create navigation
  const handleCreateClick = useCallback(() => {
    navigate(`/transactions/inward/create`);
  }, [navigate]);

  // ==========================================
  // TABLE CONTROLLER - Single source of truth for filters
  // ==========================================

  // Use controller hook to manage table state and filters
  // Controller manages URL filters and provides API-ready filters in DD/MM/YYYY format
  const { state, handlers, apiFilters, applyVersion } = useInwardTableController({
    data: [], // Will be updated after query
    loading: false, // Will be updated after query
    error: null, // Will be updated after query
    onRefresh: () => handleRefreshRef.current(),
    onDelete: handleDelete,
    onPrintChalan: handlePrintChalan,
    onEdit: handleEdit,
    filterPrefix: 'inward',
  });

  // Fetch data using filters from controller (already in DD-MM-YYYY format)
  const inwardsQuery = useInwardEntriesListQuery({
    ...(apiFilters ?? {}),
    page: Math.max(state.page - 1, 0),
    limit: state.rowsPerPage,
  }, { enabled: hasLaboratoryAccess });
  const inwardEntries = inwardsQuery.data?.items || [];
  const loading = inwardsQuery.isLoading || inwardsQuery.isFetching;
  const error = inwardsQuery.error ? (inwardsQuery.error as Error).message : null;
  const refetchInwards = inwardsQuery.refetch;

  useEffect(() => {
    if (applyVersion === 0) return;
    void refetchInwards();
  }, [applyVersion, refetchInwards]);

  // Update refresh handler ref
  handleRefreshRef.current = useCallback(() => {
    refetchInwards();
  }, [refetchInwards]);
  // Merge query state with controller state
  const tableState = {
    ...state, 
    data: inwardEntries,
    totalItems: inwardsQuery.data?.total ?? inwardEntries.length,
    totalPages: inwardsQuery.data?.totalPages ?? 1,
    isServerPagination: true,
    loading,
    error: error || null,
  };

  const tableHandlers = handlers;
  return (
    <TablePageWrapper
      title="Inward List"
      description="Manage your all inward data"
      actions={
        canManageInward ? (
          <Button
            onClick={handleCreateClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200 flex items-center gap-2"
            aria-label="Create new inward entry"
          >
            <PlusIcon className="w-4 h-4" aria-hidden="true" />
            Create Inward
          </Button>
        ) : undefined
      }
    >
      {hasLaboratoryAccess ? (
        <div className="w-full">
          {/* Pure presentational table component */}
          <InwardTable
            state={tableState}
            handlers={tableHandlers}
            organizations={organizations}
            organizationsLoading={organizationsLoading}
            canManageInward={canManageInward}
          />
        </div>
      ) : (
        <div className="flex min-h-48 items-center justify-center rounded-md border border-amber-200 bg-amber-50 px-6 text-center text-sm font-medium text-amber-800">
          Select a laboratory to view and manage inward records.
        </div>
      )}
      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={closeDelete}
        title={isSuperAdmin ? "Delete or cancel inward cycle" : "Archive inward entry"}
        message={
          <>
            {isSuperAdmin
              ? "This permanently deletes inward-owned data when there are no downstream records. If certificates exist, the inward cycle will be archived and certificates voided; outward, invoice, or active repair records must be resolved first. Gauge records and numbering history are always retained. "
              : "This archives the inward and its inward-owned records from active workflows while preserving history and gauge inventory. "}
            Inward for{' '}
            <span className="font-semibold text-gray-900">
              {pendingDelete?.client_org_name ?? 'this client'}
            </span>
            ?
          </>
        }
        confirmText={isSuperAdmin ? "Continue" : "Archive"}
        isConfirmLoading={isDeleting}
        onConfirm={confirmDelete}
      />
    </TablePageWrapper>
  );
});

InwardPage.displayName = 'InwardPage';

export default InwardPage; 
