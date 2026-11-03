import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@heroui/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { RepairDraftForm } from '../../components/form/RepairDraftForm';
import { useOrganizations } from '../../hooks/useOrganizations';
import {
  mapRepairDraftToCreatePayload,
  useCreateRepairMutation,
} from '../../hooks/queries/repairs';
import { toast } from 'sonner';
import type { RepairDraftFormData } from '../../types/repair';

const RepairCreatePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { organizations } = useOrganizations('customers');
  const createRepairMutation = useCreateRepairMutation();

  const handleCancel = () => {
    const returnTo = searchParams.get('returnTo');
    navigate(returnTo || '/maintenance');
  };

  const handleSubmit = async (data: RepairDraftFormData) => {
    try {
      const repair = await createRepairMutation.mutateAsync(mapRepairDraftToCreatePayload(data));
      const repairId = repair?.id || repair?.repair_id;
      if (!repairId) throw new Error('Repair draft was created without an ID.');
      toast.success('Repair draft created. Add repair items next.');
      navigate(`/maintenance/edit/${repairId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create repair. Please try again.';
      toast.error(message);
      throw error;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Button variant="ghost" onPress={handleCancel} className="px-0 text-slate-600">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Repairs
        </Button>
      </div>

      <RepairDraftForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        organizations={organizations || []}
        isSubmitting={createRepairMutation.isPending}
      />
    </div>
  );
};

export default RepairCreatePage;
