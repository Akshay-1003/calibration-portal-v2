import { Button } from "@heroui/react";
import { useMemo, useState } from "react";
import { TablePageWrapper } from "../../../components/layout/TablePageWrapper";
import ThreadRingPlugListTable from "../../../components/Tables/ThreadRingPlugListTable";
import { useNavigate } from "react-router-dom";
import {
  useThreadRingPlugBySpecificationQuery,
  useDeleteThreadRingPlugMutation,
  useThreadRingPlugsListQuery,
} from "../../../hooks/queries/threadRingPlugs";
import { toApiPage, toUiPage } from "../../../utils/paginatedResponse";
import { logger } from "../../../utils/logger";
import type { ThreadRingPlugData } from "../../../store/threadRingPlugStore";
import { useDebounce } from "../../../hooks/useDebounce";

const matchesThreadRingPlugSearch = (item: ThreadRingPlugData, searchValue: string) => {
  const normalizedSearch = searchValue.trim().toLowerCase();
  if (!normalizedSearch) return true;

  const searchableText = [item.gauge_type, item.standard_specification]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return normalizedSearch
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => searchableText.includes(word));
};

const ThreadRingPlugPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchValue = useDebounce(searchValue.trim(), 400);

  const queryFilters = useMemo(
    () => ({
      page: toApiPage(page),
      limit: rowsPerPage,
    }),
    [page, rowsPerPage]
  );

  const {
    data: listData,
    isLoading,
    error,
    refetch,
  } = useThreadRingPlugsListQuery(queryFilters);

  if (error) {
    logger.error("Thread ring plugs query error:", error);
  }

  const deleteMutation = useDeleteThreadRingPlugMutation();

  const items = listData?.items ?? [];
  const total = listData?.total ?? 0;
  const effectivePage = listData ? toUiPage(listData.page) : page;
  const effectiveRowsPerPage = listData?.limit ?? rowsPerPage;
  const localSearchMatches = useMemo(
    () => items.filter((item) => matchesThreadRingPlugSearch(item, searchValue)),
    [items, searchValue]
  );
  const shouldRunFallbackSearch =
    debouncedSearchValue.length > 0 && localSearchMatches.length === 0;

  const fallbackSearchQuery = useThreadRingPlugBySpecificationQuery(debouncedSearchValue, {
    enabled: shouldRunFallbackSearch,
  });

  const fallbackMatch = fallbackSearchQuery.data;
  const isSearchActive = searchValue.trim().length > 0;
  const displayItems = useMemo(() => {
    if (!isSearchActive) return items;
    if (localSearchMatches.length > 0) return localSearchMatches;
    return fallbackMatch ? [fallbackMatch] : [];
  }, [fallbackMatch, isSearchActive, items, localSearchMatches]);

  const displayTotal = isSearchActive ? displayItems.length : total;
  const displayPage = isSearchActive ? 1 : effectivePage;
  const displayRowsPerPage = isSearchActive
    ? Math.max(effectiveRowsPerPage, displayItems.length || effectiveRowsPerPage)
    : effectiveRowsPerPage;
  const displayLoading =
    isLoading || (shouldRunFallbackSearch && fallbackSearchQuery.isFetching && !fallbackMatch);

  const handleEdit = (standardSpecification: string) => {
    navigate(`/masters/thread-ring-plug/edit/${standardSpecification}`);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      logger.error("Delete failed:", error);
    }
  };
  return (
    <div className="space-y-6">
      <TablePageWrapper
        title="Thread Ring/Plug Specification Master"
        description="Manage thread ring and plug gauge specifications"
        actions={
          <Button
            onPress={() => navigate('/masters/thread-ring-plug/create')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Create Thread Ring/Plug Master
          </Button>
        }
      >
        <ThreadRingPlugListTable
          data={displayItems}
          total={displayTotal}
          page={displayPage}
          rowsPerPage={displayRowsPerPage}
          loading={displayLoading}
          error={error instanceof Error ? error.message : null}
          onRefresh={() => refetch()}
          onPageChange={isSearchActive ? undefined : setPage}
          onRowsPerPageChange={(nextRowsPerPage) => {
            setRowsPerPage(nextRowsPerPage);
            setPage(1);
          }}
          searchValue={searchValue}
          onSearchChange={(nextSearchValue) => {
            setSearchValue(nextSearchValue);
            setPage(1);
          }}
          onDeleteThreadRingPlug={handleDelete}
          onEdit={handleEdit}
        />
      </TablePageWrapper>
    </div>
  );
};

export default ThreadRingPlugPage;
