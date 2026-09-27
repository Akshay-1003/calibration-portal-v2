import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { TablePageWrapper } from "../../../components/layout/TablePageWrapper";
import ScopeMasterListTable from "../../../components/Tables/ScopeMasterListTable";
import { useMasterDataStore } from "../../../store/useStore";
import { toast } from "sonner";
import { useScopeMastersListQuery, useScopeMastersQuery } from "../../../hooks/queries/scopeMasters";
import { useDebounce } from "../../../hooks/useDebounce";

const ScopeMasterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    deleteScopeMaster,
    gaugeMasterLoading,
    gaugeMasterList,
    fetchGaugeMasters,
  } = useMasterDataStore();
  const page = Math.max(Number(searchParams.get("page") ?? "1") || 1, 1);
  const rowsPerPage = Math.max(
    Number(searchParams.get("rowsPerPage") ?? "10") || 10,
    1
  );
  const search = searchParams.get("search") ?? "";
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput.trim(), 400);
  const showCreateToast = Boolean(location.state?.fromCreate);
  const showEditToast = Boolean(location.state?.fromEdit);
  const isSearchMode = Boolean(debouncedSearch);

  const scopeMastersQuery = useScopeMastersListQuery({
    page: Math.max(page - 1, 0),
    limit: rowsPerPage,
  });
  const allScopeMastersQuery = useScopeMastersQuery({
    enabled: isSearchMode,
  });

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const normalizedSearch = debouncedSearch;
    const normalizedParam = search.trim();

    if (normalizedSearch === normalizedParam) {
      return;
    }

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);

      if (normalizedSearch) {
        next.set("search", normalizedSearch);
      } else {
        next.delete("search");
      }

      next.set("page", "1");
      return next;
    }, { replace: true });
  }, [debouncedSearch, search, setSearchParams]);

  useEffect(() => {
    if (gaugeMasterList.length === 0 && !gaugeMasterLoading) {
      void fetchGaugeMasters();
    }
  }, [fetchGaugeMasters, gaugeMasterList.length, gaugeMasterLoading]);

  useEffect(() => {
    const resolvedTotalPages = scopeMastersQuery.data?.totalPages;
    if (
      !isSearchMode &&
      !scopeMastersQuery.isFetching &&
      typeof resolvedTotalPages === "number" &&
      resolvedTotalPages > 0 &&
      page > resolvedTotalPages
    ) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("page", String(resolvedTotalPages));
        return next;
      }, { replace: true });
    }
  }, [isSearchMode, page, scopeMastersQuery.data?.totalPages, scopeMastersQuery.isFetching, setSearchParams]);

  // Show success toast when returning from create/edit
  useEffect(() => {
    if (showCreateToast) {
      toast.success("Scope master created successfully");
      void scopeMastersQuery.refetch();
      void allScopeMastersQuery.refetch();
      // Clear the state to prevent showing toast on refresh
      window.history.replaceState({}, document.title);
    } else if (showEditToast) {
      toast.success("Scope master updated successfully");
      void scopeMastersQuery.refetch();
      void allScopeMastersQuery.refetch();
      // Clear the state to prevent showing toast on refresh
      window.history.replaceState({}, document.title);
    }
  }, [allScopeMastersQuery.refetch, scopeMastersQuery.refetch, showCreateToast, showEditToast]);

  const handleRefresh = useCallback(() => {
    void scopeMastersQuery.refetch();
    void allScopeMastersQuery.refetch();
  }, [allScopeMastersQuery, scopeMastersQuery]);

  const handleDelete = async (id: string) => {
    try {
      await deleteScopeMaster(id);
      await scopeMastersQuery.refetch();
      await allScopeMastersQuery.refetch();
      toast.success("Scope master deleted successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete scope master";
      toast.error(errorMessage);
    }
  };

  const handleEdit = (id: string) => {
    const returnTo = `${location.pathname}${location.search}`;
    navigate(`/masters/scope-master/edit/${id}?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  const handlePageChange = useCallback((nextPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(nextPage));
      return next;
    });
  }, [setSearchParams]);

  const handleRowsPerPageChange = useCallback((nextRowsPerPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("rowsPerPage", String(nextRowsPerPage));
      next.set("page", "1");
      return next;
    });
  }, [setSearchParams]);

  const tableData = useMemo(
    () => (isSearchMode ? (allScopeMastersQuery.data ?? []) : (scopeMastersQuery.data?.items ?? [])),
    [allScopeMastersQuery.data, isSearchMode, scopeMastersQuery.data?.items]
  );

  return (
    <TablePageWrapper
      title="Scope Master List"
      description="Manage calibration scope definitions"
      actions={
        <Button
          onClick={() => {
            const returnTo = `${location.pathname}${location.search}`;
            navigate(`/masters/scope-master/create?returnTo=${encodeURIComponent(returnTo)}`);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Create Scope Master
        </Button>
      }
    >
      <div className="w-full">
        <ScopeMasterListTable
          data={tableData}
          loading={isSearchMode ? allScopeMastersQuery.isLoading : scopeMastersQuery.isLoading}
          error={
            isSearchMode
              ? (allScopeMastersQuery.error ? (allScopeMastersQuery.error as Error).message : null)
              : (scopeMastersQuery.error ? (scopeMastersQuery.error as Error).message : null)
          }
          onRefresh={handleRefresh}
          onDelete={handleDelete}
          onEdit={handleEdit}
          page={page}
          rowsPerPage={rowsPerPage}
          totalItems={scopeMastersQuery.data?.total ?? 0}
          totalPages={scopeMastersQuery.data?.totalPages ?? 1}
          isServerPagination={!isSearchMode}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          searchValue={searchInput}
          onSearchChange={handleSearchChange}
        />
      </div>
    </TablePageWrapper>
  );
};

export default ScopeMasterPage;
