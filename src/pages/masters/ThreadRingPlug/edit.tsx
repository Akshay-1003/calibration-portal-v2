import { useParams, useNavigate } from "react-router-dom";
import { FormPageWrapper } from "../../../components/layout/PageWrapper";
import ThreadRingPlugForm from "../../../components/form/ThreadRingPlugForm";

const ThreadRingPlugEditPage = () => {
  const { id } = useParams<{ id: string }>();
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
      title="Edit Thread Ring/Plug Master"
      description="Update thread ring/plug gauge specification"
    >
      <ThreadRingPlugForm 
        mode="edit" 
        standard_specification={id}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </FormPageWrapper>
  );
};

export default ThreadRingPlugEditPage;
