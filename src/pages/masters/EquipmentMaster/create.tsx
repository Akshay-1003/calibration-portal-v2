
import { useNavigate } from "react-router";
import EquipmentMasterForm from "../../../components/form/EquipmentMasterForm";
import { FormPageWrapper } from "../../../components/layout/PageWrapper";
import { useEquipmentsWithQuery } from "../../../hooks/useEquipmentsWithQuery";

const EquipmentMasterFormPage = () => {
  const navigate = useNavigate();
  const { refreshEquipments } = useEquipmentsWithQuery();

  const handleSuccess = async () => {
    // Invalidate cache and refetch the entire list
    await refreshEquipments();
    // Navigate back to the list page
    navigate('/masters/equipment-master');
  };

  const handleCancel = () => {
    navigate('/masters/equipment-master');
  };

  return (
    <FormPageWrapper
     
    >
      <EquipmentMasterForm 
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </FormPageWrapper>
  );
};

export default EquipmentMasterFormPage; 
