import { Controller, useForm } from 'react-hook-form';
import { Button, Card, Input, Label, ListBox, Select } from '@heroui/react';
import type { RepairDraftFormData, RepairStatus } from '../../types/repair';

interface RepairDraftFormProps {
  initialData?: Partial<RepairDraftFormData>;
  isEditing?: boolean;
  organizations: Array<{ id: string; name: string }>;
  isSubmitting?: boolean;
  onSubmit: (data: RepairDraftFormData) => Promise<void>;
  onCancel: () => void;
}

const repairStatuses: Array<{ key: RepairStatus; label: string }> = [
  { key: 'draft', label: 'Draft' },
  { key: 'pending', label: 'Pending' },
  { key: 'under_inspection', label: 'Under Inspection' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'repair_in_progress', label: 'Repair In Progress' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export function RepairDraftForm({
  initialData,
  isEditing = false,
  organizations,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: RepairDraftFormProps) {
  const { control, handleSubmit, register, formState: { errors } } = useForm<RepairDraftFormData>({
    defaultValues: {
      repair_date: new Date().toISOString().slice(0, 10),
      client_org_id: '',
      technician_name: '',
      estimated_completion_date: '',
      repair_status: 'draft',
      ...initialData,
    },
  });

  return (
    <Card className="overflow-hidden border border-slate-200 shadow-sm">
      <Card.Header className="border-b border-slate-200 bg-white px-2 py-3">
        <div>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            {isEditing ? 'Repair Draft' : 'Create Repair Draft'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">Save the repair details, then add each repair item below.</p>
        </div>
      </Card.Header>
      <Card.Content className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-800">
              Repair Date
              <Input type="date" {...register('repair_date', { required: 'Repair date is required' })} aria-invalid={Boolean(errors.repair_date)} />
              {errors.repair_date && <span className="text-xs text-danger">{errors.repair_date.message}</span>}
            </label>

            <Controller
              name="client_org_id"
              control={control}
              rules={{ required: 'Client organization is required' }}
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium text-slate-800" isRequired>Client Organization</Label>
                  <Select
                    aria-label="Client Organization"
                    placeholder="Select client"
                    selectedKey={field.value || null}
                    isDisabled={isEditing}
                    isInvalid={Boolean(errors.client_org_id)}
                    onSelectionChange={(key) => field.onChange(key ? String(key) : '')}
                  >
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {organizations.map((organization) => (
                          <ListBox.Item key={organization.id} id={organization.id} textValue={organization.name}>
                            {organization.name}<ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  {errors.client_org_id && <span className="text-xs text-danger">{errors.client_org_id.message}</span>}
                </div>
              )}
            />

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-800">
              Technician
              <Input {...register('technician_name')} placeholder="Assigned technician" />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-800">
              Estimated Completion
              <Input type="date" {...register('estimated_completion_date')} />
            </label>
          </div>

          {isEditing && (
            <Controller
              name="repair_status"
              control={control}
              render={({ field }) => (
                <div className="flex max-w-xs flex-col gap-2">
                  <Label className="text-sm font-medium text-slate-800">Repair Status</Label>
                  <Select
                    aria-label="Repair Status"
                    selectedKey={field.value}
                    onSelectionChange={(key) => field.onChange(String(key || 'draft') as RepairStatus)}
                  >
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {repairStatuses.map((status) => (
                          <ListBox.Item key={status.key} id={status.key} textValue={status.label}>
                            {status.label}<ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              )}
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onPress={onCancel} isDisabled={isSubmitting}>Cancel</Button>
            <Button variant="primary" type="submit" isDisabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Draft' : 'Create Draft'}
            </Button>
          </div>
        </form>
      </Card.Content>
    </Card>
  );
}
