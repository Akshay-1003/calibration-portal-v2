import { useNavigate, useParams } from "react-router-dom";
import { useCallback, useState } from "react";
import { Card, CardContent } from "../../../components/ui/card";
import { FormPageWrapper } from "../../../components/layout/PageWrapper";
import SurfacePlateReferenceStandardForm from "../../../components/form/SurfacePlateReferenceStandardForm";
import {
  useSurfacePlateReferenceStandardDetailQuery,
  useUpdateSurfacePlateReferenceStandardMutation,
} from "../../../hooks/queries/surfacePlateReferenceStandards";
import { buildSurfacePlateReferenceStandardUpdatePayload } from "../../../services/surfacePlateReferenceStandards";
import type { SurfacePlateReferenceStandardFormData } from "../../../lib/validations";

const SurfacePlateMasterEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const updateMutation = useUpdateSurfacePlateReferenceStandardMutation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    data: currentRecord,
    isLoading,
  } = useSurfacePlateReferenceStandardDetailQuery(id ?? null, {
    enabled: Boolean(id),
  });

  const handleFormSuccess = useCallback(() => {
    navigate("/masters/surface-plate-master");
  }, [navigate]);

  const handleSubmit = useCallback(
    async (values: SurfacePlateReferenceStandardFormData) => {
      if (!id) return;
      setSubmitError(null);
      try {
        await updateMutation.mutateAsync({
          recordId: id,
          payload: buildSurfacePlateReferenceStandardUpdatePayload(values),
        });
        handleFormSuccess();
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : "Failed to update surface plate reference standard"
        );
      }
    },
    [handleFormSuccess, id, updateMutation]
  );

  if (isLoading) {
    return (
      <FormPageWrapper>
        <div className="max-w-5xl mx-auto">
          <Card className="shadow-lg border-0 bg-card">
            <CardContent className="p-8">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="text-muted-foreground">Loading surface plate standard...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </FormPageWrapper>
    );
  }

  if (!currentRecord) {
    return (
      <FormPageWrapper>
        <div className="max-w-5xl mx-auto">
          <Card className="shadow-lg border-0 bg-card">
            <CardContent className="p-8">
              <div className="text-center text-muted-foreground">
                Surface plate reference standard not found
              </div>
            </CardContent>
          </Card>
        </div>
      </FormPageWrapper>
    );
  }

  return (
    <FormPageWrapper>
      <SurfacePlateReferenceStandardForm
        mode="edit"
        initialData={currentRecord}
        isSubmitting={updateMutation.isPending}
        submitError={submitError}
        onCancel={() => navigate("/masters/surface-plate-master")}
        onSubmit={handleSubmit}
      />
    </FormPageWrapper>
  );
};

export default SurfacePlateMasterEditPage;
