import { Card, CardBody, CardHeader, Chip, Switch } from '@heroui-v2/react';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import type { PermissionAction, PermissionModule } from '../../../features/auth/types/auth.types';

interface PermissionModuleCardProps {
  module: {
    key: PermissionModule;
    label: string;
    description: string;
  };
  grantedActions: PermissionAction[];
  isDisabled?: boolean;
  onToggle: (module: PermissionModule, action: PermissionAction, checked: boolean) => void;
}

export const PermissionModuleCard = ({
  module,
  grantedActions,
  isDisabled = false,
  onToggle,
}: PermissionModuleCardProps) => {
  const canView = grantedActions.includes('view');
  const canEdit = grantedActions.includes('edit');

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-200 pb-3">
        <div className="flex w-full items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-primary-600" />
              <h3 className="text-base font-semibold text-slate-900">{module.label}</h3>
            </div>
            <p className="mt-1 text-sm text-slate-500">{module.description}</p>
          </div>

          <Chip color={canView ? 'success' : 'default'} variant="flat">
            {canEdit ? 'Enabled' : canView ? 'View Only' : 'Hidden'}
          </Chip>
        </div>
      </CardHeader>

      <CardBody className="grid gap-3 p-5 md:grid-cols-2">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-900">View access</p>
            <p className="text-xs text-slate-500">
              Controls visibility and page access for this module.
            </p>
          </div>
          <Switch
            aria-label={`${module.label} view access`}
            isSelected={canView}
            isDisabled={isDisabled}
            onValueChange={(checked) => onToggle(module.key, 'view', checked)}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-900">Management access</p>
            <p className="text-xs text-slate-500">
              Enables create, update, delete, archive, and submit actions where supported.
            </p>
          </div>
          <Switch
            aria-label={`${module.label} management access`}
            isSelected={canEdit}
            isDisabled={isDisabled}
            onValueChange={(checked) => onToggle(module.key, 'edit', checked)}
          />
        </div>
      </CardBody>
    </Card>
  );
};
