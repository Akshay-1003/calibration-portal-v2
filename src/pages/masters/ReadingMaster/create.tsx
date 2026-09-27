import { useNavigate } from "react-router-dom";
import { useCallback } from "react";
import ReadingMasterForm from "../../../components/form/ReadingMasterForm";
import { FormPageWrapper } from "../../../components/layout/PageWrapper";

const ReadingMasterCreatePage = () => {
  const navigate = useNavigate();

  const handleFormSuccess = useCallback(() => {
    navigate("/masters/reading-master", {
      state: { fromCreate: true },
    });
  }, [navigate]);

  return (
    <FormPageWrapper
      title="Create Reading Master"
      description="Add new reading master for a gauge"
    >
      <ReadingMasterForm mode="create" onSuccess={handleFormSuccess} />
    </FormPageWrapper>
  );
};

export default ReadingMasterCreatePage;

