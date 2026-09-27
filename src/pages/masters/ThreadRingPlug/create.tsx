import { useNavigate } from "react-router";
import ThreadRingPlugForm from "../../../components/form/ThreadRingPlugForm";
import { FormPageWrapper } from "../../../components/layout/PageWrapper";

const ThreadRingPlugCreatePage = () => {
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
      <ThreadRingPlugForm 
        mode="create"
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </FormPageWrapper>
  );
};

export default ThreadRingPlugCreatePage;
