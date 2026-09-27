
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../../components/ui/button";
import { TablePageWrapper } from "../../../components/layout/TablePageWrapper";
import CompanyGaugeListTable from "../../../components/Tables/CompanyGaugeListTable";
import { useMasterDataStore } from "../../../store/useStore";
import { useGaugeMastersListQuery } from "../../../hooks/queries/gaugeMasters";
import { useDebounce } from "../../../hooks/useDebounce";
import { usePermissionAccess } from "../../../features/auth";

const GaugesMasterPage = () => {
  const { canEdit } = usePermissionAccess();
  const canManageGauges = canEdit("gauge_master");
  const navigate = useNavigate();
  const { deleteGauge } = useMasterDataStore();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 350);

  const gaugeMastersQuery = useGaugeMastersListQuery({
    page: Math.max(page - 1, 0),
    limit: rowsPerPage,
    search: debouncedSearch,
  });

  const handleRefresh = useCallback(() => {
    void gaugeMastersQuery.refetch();
  }, [gaugeMastersQuery]);


  return (
    <TablePageWrapper
      title="Gauge Master List"
      description="Manage your gauge master entries and specifications"
      actions={
        canManageGauges ? (
          <Button
            onClick={() => navigate('/masters/gauges-master/create')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Create Gauge Master
          </Button>
        ) : undefined
      }
    >
      <div className="w-full p-2">
        <CompanyGaugeListTable
          data={gaugeMastersQuery.data?.items ?? []}
          onDeleteGauge={deleteGauge}
          gaugeMasterLoading={gaugeMastersQuery.isLoading || gaugeMastersQuery.isFetching}
          error={gaugeMastersQuery.error ? (gaugeMastersQuery.error as Error).message : null}
          onRefresh={handleRefresh}
          page={page}
          rowsPerPage={rowsPerPage}
          totalItems={gaugeMastersQuery.data?.total ?? 0}
          totalPages={gaugeMastersQuery.data?.totalPages ?? 1}
          isServerPagination
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          canManageGauges={canManageGauges}
        />
      </div>
    </TablePageWrapper>
  );
};

export default GaugesMasterPage; 
