import { useNavigate, useLocation } from "react-router";
import React, { useCallback, useEffect, useRef } from "react";
import { OutwardTable } from "../../../components/Tables/OutwardTable";
import { TablePageWrapper } from "../../../components/layout/TablePageWrapper";
import { Button } from "../../../components/ui/button";
import { PlusIcon } from "@heroicons/react/24/solid";
import {
  useDeleteOutwardEntryMutation,
  usePaginatedOutwardEntriesQuery,
} from "../../../hooks/queries/outwards";
import { transformOutwardToChalanData } from "../../../components/chalan/chalanUtils";
import { printOutwardChalan } from "../../../utils/outwardChalanPrint";
import { useOutwardStore } from "../../../store/outwardStore";
import { toast } from "sonner";
import { useTableUrlState } from "../../../hooks/useTableUrlState";
import { toApiPage } from "../../../utils/paginatedResponse";

const OutwardPage = React.memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    state: tableUrlState,
    setPage,
    setRowsPerPage,
  } = useTableUrlState({ prefix: "outward", defaultRowsPerPage: 10 });
  const page = tableUrlState.page;
  const rowsPerPage = tableUrlState.rowsPerPage;
  const {
    data: outwardEntriesResult,
    isLoading,
    isFetching,
    error: outwardEntriesError,
    refetch: refetchOutwardEntries,
  } = usePaginatedOutwardEntriesQuery({
    page: toApiPage(page),
    limit: rowsPerPage,
  });
  const deleteOutwardEntryMutation = useDeleteOutwardEntryMutation();
  const outwardEntries = outwardEntriesResult?.items ?? [];
  const totalItems = outwardEntriesResult?.total ?? outwardEntries.length;
  const totalPages = outwardEntriesResult?.totalPages ?? Math.max(Math.ceil(totalItems / Math.max(rowsPerPage, 1)), 1);
  const showCreateToast = Boolean(location.state?.fromCreate);
  const showEditToast = Boolean(location.state?.fromEdit);
  const hasConsumedNavigationState = useRef(false);
  
  // Outward store for fetching items
  const { fetchOutwardEntry, fetchOutwardItems } = useOutwardStore();

  // Handle refresh
  const handleRefresh = useCallback(() => {
    void refetchOutwardEntries();
  }, [refetchOutwardEntries]);

  const handleRowsPerPageChange = useCallback((nextRowsPerPage: number) => {
    setRowsPerPage(nextRowsPerPage);
    setPage(1);
  }, [setPage, setRowsPerPage]);

  // Handle open
  const handleOpen = useCallback((id: string) => {
    navigate(`/transactions/outward/${id}`);
  }, [navigate]);

  // Handle print
  const handlePrint = useCallback(async (id: string) => {
    try {
      // Fetch outward entry and items
      await Promise.all([
        fetchOutwardEntry(id),
        fetchOutwardItems(id),
      ]);

      // Get the data from store after fetching
      const store = useOutwardStore.getState();
      const entry = store.outwardEntry;
      const items = store.outwardItems;

      if (!entry) {
        toast.error("Failed to load outward entry");
        return;
      }

      if (!items || items.length === 0) {
        toast.error("No items found for this outward");
        return;
      }

      // Transform and print
      const transformedData = transformOutwardToChalanData(entry, items);
      printOutwardChalan(transformedData);
    } catch (error) {
      console.error("Error printing chalan:", error);
      toast.error("Failed to print chalan");
    }
  }, [fetchOutwardEntry, fetchOutwardItems]);

  // Handle delete
  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteOutwardEntryMutation.mutateAsync(id);
      // Data will be automatically refreshed via TanStack Query invalidation
    } catch (error) {
      // Error is already handled by the mutation
      console.error("Failed to delete outward entry:", error);
    }
  }, [deleteOutwardEntryMutation]);

  // Memoize navigation handler with returnTo
  const handleCreateClick = useCallback(() => {
    const returnTo = `${location.pathname}${location.search}`;
    navigate(`/transactions/outward/create?returnTo=${encodeURIComponent(returnTo)}`);
  }, [navigate, location.pathname, location.search]);

  useEffect(() => {
    if ((showCreateToast || showEditToast) && !hasConsumedNavigationState.current) {
      hasConsumedNavigationState.current = true;
      void refetchOutwardEntries();
      navigate(
        {
          pathname: location.pathname,
          search: location.search,
        },
        {
          replace: true,
          state: null,
        },
      );
      return;
    }

    if (!showCreateToast && !showEditToast) {
      hasConsumedNavigationState.current = false;
    }
  }, [
    location.pathname,
    location.search,
    navigate,
    refetchOutwardEntries,
    showCreateToast,
    showEditToast,
  ]);

  return (
    <TablePageWrapper 
      title="Outward List" 
      description="Manage all outward dispatch entries"
      actions={
        <Button 
          onClick={handleCreateClick}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200 flex items-center gap-2"
          aria-label="Create new outward entry"
        >
          <PlusIcon className="w-4 h-4" aria-hidden="true" />
          Create Outward
        </Button>
      }
    >
      <div className="w-full">
        <OutwardTable 
          loading={isLoading || isFetching || deleteOutwardEntryMutation.isPending} 
          error={outwardEntriesError ? (outwardEntriesError as Error).message : null} 
          data={outwardEntries}
          page={page}
          rowsPerPage={rowsPerPage}
          totalItems={totalItems}
          totalPages={totalPages}
          isServerPagination
          onPageChange={setPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          onRefresh={handleRefresh}
          onOpen={handleOpen}
          onPrint={handlePrint}
          onDelete={handleDelete}
        />
      </div>
    </TablePageWrapper>
  );
});

export default OutwardPage; 
