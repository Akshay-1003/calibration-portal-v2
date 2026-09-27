import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useCallback } from "react";
import ReadingMasterForm from "../../../components/form/ReadingMasterForm";
import { FormPageWrapper } from "../../../components/layout/PageWrapper";
import { Card, CardContent } from "../../../components/ui/card";
import { useReadingMasterStore } from "../../../store/readingMasterStore";
import { useGaugeStore } from "../../../store/gaugeStore";

const ReadingMasterEditPage = () => {
  const { id: gaugeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentReadingMaster,
    currentLoading,
    actions: { fetchByGaugeId, clearCurrent },
  } = useReadingMasterStore();
  const { gaugeMasterList, fetchGauges, loading: gaugeLoading } = useGaugeStore();

  useEffect(() => {
    if (gaugeId) {
      fetchByGaugeId(gaugeId);
    }
  }, [gaugeId, fetchByGaugeId]);

  useEffect(() => {
    if (gaugeMasterList.length === 0) {
      fetchGauges();
    }
  }, [fetchGauges, gaugeMasterList.length]);

  useEffect(() => {
    return () => {
      clearCurrent();
    };
  }, [clearCurrent]);

  const handleFormSuccess = useCallback(() => {
    navigate("/masters/reading-master", {
      state: { fromEdit: true },
    });
  }, [navigate]);

  if (currentLoading || gaugeLoading) {
    return (
      <FormPageWrapper
        title="Edit Reading Master"
        description="Update reading master information"
      >
        <div className="max-w-5xl mx-auto">
          <Card className="shadow-lg border-0 bg-card">
            <CardContent className="p-8">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="text-muted-foreground">Loading reading master data...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </FormPageWrapper>
    );
  }

  if (!currentReadingMaster && !currentLoading) {
    return (
      <FormPageWrapper
        title="Edit Reading Master"
        description="Update reading master information"
      >
        <div className="max-w-5xl mx-auto">
          <Card className="shadow-lg border-0 bg-card">
            <CardContent className="p-8">
              <div className="text-center text-muted-foreground">
                Reading master not found
              </div>
            </CardContent>
          </Card>
        </div>
      </FormPageWrapper>
    );
  }

  return (
    <FormPageWrapper
      title="Edit Reading Master"
      description="Update reading master information"
    >
      <ReadingMasterForm
        mode="edit"
        gaugeId={gaugeId}
        initialData={
          currentReadingMaster
            ? { readings: currentReadingMaster.readings }
            : undefined
        }
        onSuccess={handleFormSuccess}
      />
    </FormPageWrapper>
  );
};

export default ReadingMasterEditPage;

