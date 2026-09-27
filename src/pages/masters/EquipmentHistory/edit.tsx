import { useParams, useNavigate } from "react-router-dom";
import EquipmentHistoryForm from "../../../components/form/EquipmentHistoryForm";
import { FormPageWrapper } from "../../../components/layout/PageWrapper";

const EquipmentHistoryEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/masters/equipment-history', { 
      state: { fromEdit: true },
      replace: true 
    });
  };

  const handleCancel = () => {
    navigate('/masters/equipment-history');
  };

  return (
    <FormPageWrapper>
      <EquipmentHistoryForm 
        mode="edit" 
        historyId={id}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </FormPageWrapper>
  );
};

export default EquipmentHistoryEdit;
