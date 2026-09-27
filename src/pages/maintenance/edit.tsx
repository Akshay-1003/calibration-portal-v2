import { useMemo } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { Button } from '@heroui/react';
import RepairForm from '../../components/form/RepairForm';
import { useGaugeMastersWithQuery } from '../../hooks/useGaugeMastersWithQuery';
import { useOrganizations } from '../../hooks/useOrganizations';
import {
  mapRepairApiToFormData,
  mapRepairFormToUpdatePayload,
  useRepairQuery,
  useUpdateRepairMutation,
} from '../../hooks/queries/repairs';
import { toast } from 'sonner';
import type { RepairFormData } from '../../types/repair';

const RepairEditPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();

  const { organizations } = useOrganizations('customers');
  const { gaugeMasters } = useGaugeMastersWithQuery();

  const repairQuery = useRepairQuery(id || null, { enabled: !!id });
  const updateRepairMutation = useUpdateRepairMutation();

  const initialData = useMemo(() => {
    if (!repairQuery.data) return null;
    return mapRepairApiToFormData(repairQuery.data);
  }, [repairQuery.data]);

  const handleCancel = () => {
    const returnTo = searchParams.get('returnTo');
    navigate(returnTo || '/maintenance');
  };

  const handleSubmit = async (data: RepairFormData) => {
    if (!id) {
      toast.error('Repair id is missing');
      return;
    }

    try {
      await updateRepairMutation.mutateAsync({
        id,
        payload: mapRepairFormToUpdatePayload(data),
      });
      toast.success('Repair updated successfully!');

      const returnTo = searchParams.get('returnTo');
      navigate(returnTo || '/maintenance');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update repair. Please try again.';
      toast.error(message);
      throw error;
    }
  };

  if (repairQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading repair data...</p>
        </div>
      </div>
    );
  }

  if (repairQuery.isError || !initialData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Repair not found</p>
          <Button color="primary" onClick={() => navigate('/maintenance')}>
            Back to Repairs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-6">
        <Button variant="flat" onClick={handleCancel} className="mb-4">
          ← Back to Repairs
        </Button>
      </div>

      <RepairForm
        isEditing
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        gaugeMasterList={gaugeMasters || []}
        organizations={organizations || []}
        isSubmitting={updateRepairMutation.isPending}
      />
    </div>
  );
};

export default RepairEditPage;
