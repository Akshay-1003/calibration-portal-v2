import { useNavigate } from "react-router";
import TaperThreadReadingsForm from "../../../components/form/TaperThreadReadingsForm";
import { FormPageWrapper } from "../../../components/layout/PageWrapper";

const TaperThreadReadingsCreatePage = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    // Navigate back (React Query will handle cache invalidation)
    navigate(-1);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <FormPageWrapper
      title=""
      description=""
    >
      <TaperThreadReadingsForm 
        mode="create"
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </FormPageWrapper>
  );
};

export default TaperThreadReadingsCreatePage;






