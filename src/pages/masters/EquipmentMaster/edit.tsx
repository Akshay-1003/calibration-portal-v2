import { useParams, useNavigate } from "react-router-dom";
import EquipmentMasterForm from "../../../components/form/EquipmentMasterForm";
import { FormPageWrapper } from "../../../components/layout/PageWrapper";

const EquipmentMasterEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/masters/equipment-master');
  };

  const handleCancel = () => {
    navigate('/masters/equipment-master');
  };

  return (
    <FormPageWrapper>
      <EquipmentMasterForm 
        mode="edit" 
        equipmentId={id} 
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </FormPageWrapper>
  );
};

export default EquipmentMasterEdit;
