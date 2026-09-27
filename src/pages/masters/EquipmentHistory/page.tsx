import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { Button } from "../../../components/ui/button";
import { TablePageWrapper } from "../../../components/layout/TablePageWrapper";
import EquipmentHistoryListTable from "../../../components/Tables/EquipmentHistoryListTable";
import { useEquipmentHistoryStore } from "../../../store/equipmentHistoryStore";
import { useEquipmentHistoriesListQuery } from "../../../hooks/queries/equipmentHistories";

const EquipmentHistoryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Use equipment history store
  const { 
    deleteEquipmentHistory, 
    refreshEquipmentHistories,
  } = useEquipmentHistoryStore();
  void refreshEquipmentHistories;

  const equipmentHistoriesQuery = useEquipmentHistoriesListQuery({
    page: Math.max(page - 1, 0),
    limit: rowsPerPage,
  });

  // Fetch data on component mount and when returning from create page
  useEffect(() => {
    const shouldForceRefresh = location.state?.fromCreate || false;
    
    if (shouldForceRefresh) {
      void equipmentHistoriesQuery.refetch();
      window.history.replaceState({}, document.title);
    }
  }, [equipmentHistoriesQuery, location.state]);

  // Also refresh data when page becomes visible (handles browser back button)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && useEquipmentHistoryStore.getState().isDataStale()) {
        void equipmentHistoriesQuery.refetch();
      }
    };

    const handleFocus = () => {
      if (useEquipmentHistoryStore.getState().isDataStale()) {
        void equipmentHistoriesQuery.refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [equipmentHistoriesQuery]);

  const handleDelete = async (historyId: string) => {
    await deleteEquipmentHistory(historyId);
    await equipmentHistoriesQuery.refetch();
  };

  return (
    <TablePageWrapper
      title="Equipment History List"
      description="Manage equipment calibration history and records"
      actions={
        <Button
          onClick={() => navigate('/masters/equipment-history/create')}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Create Equipment History
        </Button>
      }
    >
      <div className="w-full">
        <EquipmentHistoryListTable 
          data={equipmentHistoriesQuery.data?.items ?? []}
          onDeleteHistory={handleDelete}
          loading={equipmentHistoriesQuery.isLoading || equipmentHistoriesQuery.isFetching}
          error={equipmentHistoriesQuery.error ? (equipmentHistoriesQuery.error as Error).message : null}
          onRefresh={() => void equipmentHistoriesQuery.refetch()}
          page={page}
          rowsPerPage={rowsPerPage}
          totalItems={equipmentHistoriesQuery.data?.total ?? 0}
          totalPages={equipmentHistoriesQuery.data?.totalPages ?? 1}
          isServerPagination
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
        />
      </div>
    </TablePageWrapper>
  );
};

export default EquipmentHistoryPage;
