import { Button } from "@heroui/react";
import { TablePageWrapper } from "../../../components/layout/TablePageWrapper";
import TaperThreadReadingsListTable from "../../../components/Tables/TaperThreadReadingsListTable";
import { TaperThreadReadingsData } from "../../../store/taperThreadReadingsStore";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTaperThreadReadings,
  deleteTaperThreadReading,
} from "../../../services/apiServices";
import { logger } from "../../../utils/logger";

const TaperThreadReadingsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  /* ---------------- Fetch List ---------------- */
  const {
    data = [],
    isLoading,
    isError,
    error,
  } = useQuery<TaperThreadReadingsData[]>({
    queryKey: ["taper-thread-readings"],
    queryFn: fetchTaperThreadReadings,
    enabled: true, // Explicitly enable the query
    retry: 1,
    retryOnMount: true,
    refetchOnMount: true,
  });

  // Log errors for debugging
  if (error) {
    logger.error("Taper thread readings query error:", error);
  }

  /* ---------------- Delete ---------------- */
  const deleteMutation = useMutation({
    mutationFn: deleteTaperThreadReading,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["taper-thread-readings"],
      });
    },
  });

  const handleEdit = (standardSpecification: string) => {
    navigate(`/masters/taper-thread-readings/edit/${standardSpecification}`);
  };

  const handleDelete = async (standardSpecification: string) => {
    try {
      await deleteMutation.mutateAsync(standardSpecification);
    } catch (error) {
      logger.error("Delete failed:", error);
    }
  };

  return (
    <div className="space-y-6">
      <TablePageWrapper
        title="Taper Thread Readings Master"
        description="Manage taper thread readings specifications"
        actions={
          <Button
            onPress={() => navigate('/masters/taper-thread-readings/create')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Create Taper Thread Reading
          </Button>
        }
      >
        <TaperThreadReadingsListTable
          data={data}
          loading={isLoading}
          error={isError ? "Failed to load data" : null}
          onRefresh={() => queryClient.invalidateQueries({
            queryKey: ["taper-thread-readings"],
          })}
          onDeleteTaperThreadReading={handleDelete}
          onEdit={handleEdit}
        />
      </TablePageWrapper>
    </div>
  );
};

export default TaperThreadReadingsPage;

