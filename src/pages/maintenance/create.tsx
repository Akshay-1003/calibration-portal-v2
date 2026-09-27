import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@heroui/react';
import RepairForm from '../../components/form/RepairForm';
import { useGaugeMastersWithQuery } from '../../hooks/useGaugeMastersWithQuery';
import { useOrganizations } from '../../hooks/useOrganizations';
import {
  mapRepairFormToCreatePayload,
  useCreateRepairMutation,
} from '../../hooks/queries/repairs';
import { toast } from 'sonner';
import type { RepairFormData } from '../../types/repair';

const RepairCreatePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { organizations } = useOrganizations('customers');
  const { gaugeMasters } = useGaugeMastersWithQuery();
  const createRepairMutation = useCreateRepairMutation();

  const handleCancel = () => {
    const returnTo = searchParams.get('returnTo');
    navigate(returnTo || '/maintenance');
  };

  const handleSubmit = async (data: RepairFormData) => {
    try {
      await createRepairMutation.mutateAsync(mapRepairFormToCreatePayload(data));
      toast.success('Repair created successfully!');

      const returnTo = searchParams.get('returnTo');
      navigate(returnTo || '/maintenance');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create repair. Please try again.';
      toast.error(message);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-2">
        <Button variant="flat" onClick={handleCancel} className="mb-4">
          ← Back to Repairs
        </Button>
      </div>

      <RepairForm
        isEditing={false}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        gaugeMasterList={gaugeMasters || []}
        organizations={organizations || []}
        isSubmitting={createRepairMutation.isPending}
      />
    </div>
  );
};

export default RepairCreatePage;
