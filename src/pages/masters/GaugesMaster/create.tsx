
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useCallback } from "react";
import GaugesMasterForm from "../../../components/form/GaugesMasterForm";
import { FormPageWrapper } from "../../../components/layout/PageWrapper";
import { useMasterDataStore } from "../../../store/useStore";
import { Card, CardContent } from "../../../components/ui/card";

const GaugesMasterFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    gaugeMasterList,
    gaugeMasterLoading,
    getGaugeById,
    fetchGaugeMasters,
  } = useMasterDataStore();
  const isEditMode = !!id;
  const gauge = id ? getGaugeById(id) : undefined;

  useEffect(() => {
    if (isEditMode && gaugeMasterList.length === 0) {
      fetchGaugeMasters(true);
    }
  }, [isEditMode, gaugeMasterList.length, fetchGaugeMasters]);

  useEffect(() => {
    if (isEditMode && !gaugeMasterLoading && gaugeMasterList.length > 0 && !gauge) {
      navigate("/masters/gauges-master");
    }
  }, [isEditMode, gauge, gaugeMasterLoading, gaugeMasterList.length, navigate]);

  const handleFormSuccess = useCallback(
    async (_response?: any, currentMode?: "create" | "edit") => {
      await fetchGaugeMasters(true);
      const wasEdit = currentMode === "edit" || isEditMode;
      navigate("/masters/gauges-master", {
        state: { [wasEdit ? "fromEdit" : "fromCreate"]: true },
        replace: true,
      });
    },
    [fetchGaugeMasters, isEditMode, navigate]
  );

  if (isEditMode && gaugeMasterLoading) {
    return (
      <FormPageWrapper
        title="Edit Gauge Master"
        description="Update gauge master information"
      >
        <div className="max-w-5xl mx-auto">
          <Card className="shadow-lg border-0 bg-card">
            <CardContent className="p-8">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="text-muted-foreground">Loading gauge data...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </FormPageWrapper>
    );
  }

  if (isEditMode && !gauge) {
    return (
      <FormPageWrapper
        title="Edit Gauge Master"
        description="Update gauge master information"
      >
        <div className="max-w-5xl mx-auto">
          <Card className="shadow-lg border-0 bg-card">
            <CardContent className="p-8">
              <div className="text-center text-muted-foreground">
                Gauge not found
              </div>
            </CardContent>
          </Card>
        </div>
      </FormPageWrapper>
    );
  }

  return (
    <FormPageWrapper
      title={isEditMode ? "Edit Gauge Master" : "Create Gauge Master"}
      description={
        isEditMode ? "Update gauge master information" : "Add new gauge to the master list"
      }
    >
      <GaugesMasterForm
        mode={isEditMode ? "edit" : "create"}
        gaugeId={id}
        initialData={gauge}
        onSuccess={handleFormSuccess}
      />
    </FormPageWrapper>
  );
};

export default GaugesMasterFormPage;