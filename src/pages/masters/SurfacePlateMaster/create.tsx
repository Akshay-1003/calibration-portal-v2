import { useNavigate } from "react-router-dom";
import { useCallback, useState } from "react";
import SurfacePlateReferenceStandardForm from "../../../components/form/SurfacePlateReferenceStandardForm";
import { FormPageWrapper } from "../../../components/layout/PageWrapper";
import { useCreateSurfacePlateReferenceStandardMutation } from "../../../hooks/queries/surfacePlateReferenceStandards";
import { buildSurfacePlateReferenceStandardCreatePayload } from "../../../services/surfacePlateReferenceStandards";
import type { SurfacePlateReferenceStandardFormData } from "../../../lib/validations";

const SurfacePlateMasterCreatePage = () => {
  const navigate = useNavigate();
  const createMutation = useCreateSurfacePlateReferenceStandardMutation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleFormSuccess = useCallback(() => {
    navigate("/masters/surface-plate-master");
  }, [navigate]);

  const handleSubmit = useCallback(
    async (values: SurfacePlateReferenceStandardFormData) => {
      setSubmitError(null);
      try {
        await createMutation.mutateAsync(buildSurfacePlateReferenceStandardCreatePayload(values));
        handleFormSuccess();
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : "Failed to create surface plate reference standard"
        );
      }
    },
    [createMutation, handleFormSuccess]
  );

  return (
    <FormPageWrapper>
      <SurfacePlateReferenceStandardForm
        mode="create"
        isSubmitting={createMutation.isPending}
        submitError={submitError}
        onCancel={() => navigate("/masters/surface-plate-master")}
        onSubmit={handleSubmit}
      />
    </FormPageWrapper>
  );
};

export default SurfacePlateMasterCreatePage;
