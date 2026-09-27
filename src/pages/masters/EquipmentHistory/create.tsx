import { useNavigate } from "react-router";
import EquipmentHistoryForm from "../../../components/form/EquipmentHistoryForm";
import { FormPageWrapper } from "../../../components/layout/PageWrapper";

const EquipmentHistoryFormPage = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    // Navigate back to the list page with a flag to force refresh
    navigate('/masters/equipment-history', { 
      state: { fromCreate: true },
      replace: true 
    });
  };

  const handleCancel = () => {
    navigate('/masters/equipment-history');
  };

  return (
    <FormPageWrapper>
      <EquipmentHistoryForm 
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </FormPageWrapper>
  );
};

export default EquipmentHistoryFormPage;
