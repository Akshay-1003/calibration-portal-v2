import { useMemo } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { Button } from '@heroui/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import RepairForm from '../../components/form/RepairForm';
import { RepairDraftForm } from '../../components/form/RepairDraftForm';
import { RepairItemsPanel } from '../../components/repair/RepairItemsPanel';
import { useGaugeMastersWithQuery } from '../../hooks/useGaugeMastersWithQuery';
import { useOrganizations } from '../../hooks/useOrganizations';
import {
  mapRepairApiToFormData,
  mapRepairFormToUpdatePayload,
  useRepairQuery,
  useUpdateRepairMutation,
} from '../../hooks/queries/repairs';
import { toast } from 'sonner';
import type { RepairDraftFormData, RepairFormData } from '../../types/repair';

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

  const draftData = useMemo<Partial<RepairDraftFormData> | null>(() => {
    if (!repairQuery.data) return null;
    return {
      repair_date: String(repairQuery.data.repair_date || '').slice(0, 10),
      client_org_id: String(repairQuery.data.client_org_id || ''),
      technician_name: String(repairQuery.data.technician_name || repairQuery.data.repaired_by || ''),
      estimated_completion_date: String(
        repairQuery.data.estimated_completion_date || repairQuery.data.estimated_date_of_completion || '',
      ).slice(0, 10),
      repair_status: (repairQuery.data.repair_status || repairQuery.data.status || 'draft') as RepairDraftFormData['repair_status'],
    };
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

  const handleDraftSubmit = async (data: RepairDraftFormData) => {
    if (!id) return;
    try {
      await updateRepairMutation.mutateAsync({
        id,
        payload: {
          repair_date: data.repair_date,
          repaired_by: data.technician_name,
          estimated_date_of_completion: data.estimated_completion_date || undefined,
          status: data.repair_status,
        },
      });
      toast.success('Repair draft updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update repair draft.';
      toast.error(message);
      throw error;
    }
  };

  if (repairQuery.isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading repair data...</p>
        </div>
      </div>
    );
  }

  if (repairQuery.isError || !initialData || !draftData || !repairQuery.data) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Repair not found</p>
          <Button variant="primary" onClick={() => navigate('/maintenance')}>
            Back to Repairs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Button variant="ghost" onPress={handleCancel} className="px-0 text-slate-600">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Repairs
        </Button>
      </div>

      {!repairQuery.data.items?.length && (repairQuery.data.gauge_id || repairQuery.data.manual_item_name) ? (
        <RepairForm
          isEditing
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          gaugeMasterList={gaugeMasters || []}
          organizations={organizations || []}
          isSubmitting={updateRepairMutation.isPending}
        />
      ) : (
        <div className="space-y-4">
          <RepairDraftForm
            isEditing
            initialData={draftData}
            onSubmit={handleDraftSubmit}
            onCancel={handleCancel}
            organizations={organizations || []}
            isSubmitting={updateRepairMutation.isPending}
          />
          <RepairItemsPanel
            repairId={id || ''}
            clientOrgId={draftData.client_org_id || ''}
            items={repairQuery.data.items || []}
            isLocked={draftData.repair_status === 'cancelled'}
          />
        </div>
      )}
    </div>
  );
};

export default RepairEditPage;
