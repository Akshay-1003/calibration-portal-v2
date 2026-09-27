import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { TablePageWrapper } from "../../../components/layout/TablePageWrapper";
import EquipmentMasterListTable from "../../../components/Tables/EquipmentMasterListTable";
import { useEquipmentsWithQuery } from "../../../hooks/useEquipmentsWithQuery";
import { useEquipmentsListQuery } from "../../../hooks/queries/equipments";

const EquipmentMasterPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [equipmentApiPageMode, setEquipmentApiPageMode] = useState<'zero-based' | 'one-based' | null>(null);
  const [paginationMeta, setPaginationMeta] = useState({ total: 0, totalPages: 1 });

  const {
    deleteEquipment,
  } = useEquipmentsWithQuery();

  const apiPage = useMemo(() => {
    if (equipmentApiPageMode === 'one-based') {
      return page;
    }
    return Math.max(page - 1, 0);
  }, [equipmentApiPageMode, page]);

  const equipmentsQuery = useEquipmentsListQuery({
    page: apiPage,
    limit: rowsPerPage,
  });

  const equipments = equipmentsQuery.data?.items ?? [];
  const loading = equipmentsQuery.isPending || equipmentsQuery.isFetching;
  const error = equipmentsQuery.error ? (equipmentsQuery.error as Error).message : null;
  const refreshEquipments = async () => {
    await equipmentsQuery.refetch();
  };

  useEffect(() => {
    if (equipmentsQuery.data) {
      setPaginationMeta({
        total: equipmentsQuery.data.total ?? 0,
        totalPages: Math.max(equipmentsQuery.data.totalPages ?? 1, 1),
      });
    }
  }, [equipmentsQuery.data]);

  useEffect(() => {
    if (equipmentApiPageMode !== null) return;
    if (!equipmentsQuery.data) return;
    if (page !== 1) return;

    const serverPage = equipmentsQuery.data.page;
    if (serverPage === 1) {
      setEquipmentApiPageMode('one-based');
      return;
    }

    if (serverPage === 0) {
      setEquipmentApiPageMode('zero-based');
    }
  }, [equipmentApiPageMode, equipmentsQuery.data, page]);

  return (
    <TablePageWrapper
      title="Equipment Master List"
      description="Manage your equipment master entries and specifications"
      actions={
        <Button
          onClick={() => navigate('/masters/equipment-master/create')}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Create Equipment Master
        </Button>
      }
    >
      <div className="p-2">
        <EquipmentMasterListTable
          data={equipments}
          onDeleteEquipment={deleteEquipment}
          loading={loading}
          error={error}
          onRefresh={refreshEquipments}
          page={page}
          rowsPerPage={rowsPerPage}
          totalItems={equipmentsQuery.data?.total ?? paginationMeta.total}
          totalPages={equipmentsQuery.data?.totalPages ?? paginationMeta.totalPages}
          isServerPagination
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
        />
      </div>
    </TablePageWrapper>
  );
};

export default EquipmentMasterPage;
