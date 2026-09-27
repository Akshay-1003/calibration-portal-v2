import { Button } from "@heroui/react";
import { TablePageWrapper } from "../../../components/layout/TablePageWrapper";
import DialTableMasterListTable, {
  DialTableMasterData,
} from "../../../components/Tables/DialTableMasterListTable";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteDialTable,
} from "../../../services/apiServices";
import { useDialTablesQuery, dialTableKeys } from "../../../hooks/queries/dialTables";

export default function DialTableMasterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  /* ---------------- Fetch List ---------------- */
  const {
    data = [],
    isLoading,
    isError,
    refetch,
  } = useDialTablesQuery() as { data: DialTableMasterData[]; isLoading: boolean; isError: boolean };

  /* ---------------- Delete ---------------- */
  const deleteMutation = useMutation({
    mutationFn: deleteDialTable,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dialTableKeys.all,
      });
    },
  });

  const handleEdit = (id: string) => {
    navigate(`/masters/dial-table-master/edit/${id}`);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  return (
    <div className="space-y-6">
      <TablePageWrapper
        title={<div>
          <h1 className="text-xl font-semibold text-gray-900">
            Dial Table Master
          </h1>
          <p className="text-sm text-gray-500">
            Manage dial reading table configurations
          </p>
        </div>}
        actions={
          <Button onPress={() => navigate('/masters/dial-table-master/create')} className="bg-blue-600 hover:bg-blue-700 text-white">
            Create Dial Table Master
          </Button>
        }

      >
        <DialTableMasterListTable
          data={data}
          loading={isLoading}
          error={isError ? "Failed to load data" : null}
          onRefresh={() => {
            void refetch();
          }}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      </TablePageWrapper>
    </div>
  );
}
