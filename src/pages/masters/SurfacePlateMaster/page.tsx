import { useNavigate } from "react-router-dom";
import { Button } from "@heroui/react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { TablePageWrapper } from "../../../components/layout/TablePageWrapper";
import SurfacePlateReferenceStandardsListTable from "../../../components/Tables/SurfacePlateReferenceStandardsListTable";
import { DeleteConfirmModal } from "../../../components/common/DeleteConfirmModal";
import { useSurfacePlateReferenceStandardsListQuery, useDeleteSurfacePlateReferenceStandardMutation } from "../../../hooks/queries/surfacePlateReferenceStandards";
import { toApiPage, toUiPage } from "../../../utils/paginatedResponse";
import { useMemo, useState } from "react";
import type { SurfacePlateReferenceStandardRecord } from "../../../types/surfacePlateReferenceStandards";

const SurfacePlateMasterPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedRecordForDelete, setSelectedRecordForDelete] = useState<SurfacePlateReferenceStandardRecord | null>(null);

  const queryFilters = useMemo(
    () => ({
      page: toApiPage(page),
      limit: rowsPerPage,
    }),
    [page, rowsPerPage]
  );

  const {
    data: listData,
    isLoading: isListLoading,
    error: listError,
    refetch,
  } = useSurfacePlateReferenceStandardsListQuery(queryFilters);

  const deleteMutation = useDeleteSurfacePlateReferenceStandardMutation();

  const items = listData?.items ?? [];
  const total = listData?.total ?? 0;
  const effectivePage = listData ? toUiPage(listData.page) : page;

  return (
    <TablePageWrapper
      title="Surface Plate Reference Standards"
      description="Manage tolerance masters for surface plate gauges"
      actions={
        <Button
          onPress={() => navigate("/masters/surface-plate-master/create")}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          startContent={<PlusIcon className="h-4 w-4" />}
        >
          Add New
        </Button>
      }
    >
      <div className="p-2">
        <SurfacePlateReferenceStandardsListTable
          data={items}
          total={total}
          page={effectivePage}
          rowsPerPage={rowsPerPage}
          loading={isListLoading}
          error={listError instanceof Error ? listError.message : null}
          onPageChange={setPage}
          onRowsPerPageChange={(nextRowsPerPage) => {
            setRowsPerPage(nextRowsPerPage);
            setPage(1);
          }}
          onRefresh={() => refetch()}
          onEdit={(recordId) => navigate(`/masters/surface-plate-master/edit/${recordId}`)}
          onDelete={(recordId) => {
            const target = items.find((item) => item.id === recordId) ?? null;
            setSelectedRecordForDelete(target);
          }}
        />
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(selectedRecordForDelete)}
        title="Delete Surface Plate Reference Standard"
        message={`Are you sure you want to delete this surface plate reference standard${selectedRecordForDelete?.master_gauge_name ? ` for "${selectedRecordForDelete.master_gauge_name}"` : ""}?`}
        confirmText="Delete"
        isConfirmLoading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!selectedRecordForDelete) return;
          await deleteMutation.mutateAsync(selectedRecordForDelete.id);
          setSelectedRecordForDelete(null);
        }}
        onClose={() => setSelectedRecordForDelete(null)}
      />
    </TablePageWrapper>
  );
};

export default SurfacePlateMasterPage;
