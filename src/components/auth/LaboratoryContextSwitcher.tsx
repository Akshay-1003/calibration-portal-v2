import { useQuery } from '@tanstack/react-query';
import { Building2, Loader2, RotateCcw } from 'lucide-react';
import { Select, SelectItem } from '@heroui-v2/react';
import { toast } from 'sonner';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../features/auth';
import { useAuthStore } from '../../features/auth/store/authStore';
import { decodeCalibrationAccessToken } from '../../features/auth/utils/calibrationToken';
import type { Organization } from '../../types';

export function LaboratoryContextSwitcher() {
  const { user, switchLaboratoryContext } = useAuth();
  const accessToken = useAuthStore((state) => state.accessToken);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'superadmin';
  const tokenClaims = accessToken ? decodeCalibrationAccessToken(accessToken) : null;
  const isPlatformSession = tokenClaims?.scope === 'platform';
  const hasLaboratoryContext = tokenClaims?.scope === 'laboratory' && Boolean(user?.organization_id);

  const laboratoriesQuery = useQuery({
    queryKey: ['platform', 'laboratories', 'context-selector'],
    queryFn: async (): Promise<Organization[]> => {
      const response = await apiService.getLaboratories({ page: 0, limit: 500 });
      return Array.isArray(response?.organizations) ? response.organizations as Organization[] : [];
    },
    enabled: isSuperAdmin && isPlatformSession,
    staleTime: 60_000,
    retry: false,
  });

  if (!isSuperAdmin) {
    return null;
  }

  const laboratories = laboratoriesQuery.data ?? [];
  const selectedLaboratory = laboratories.find((laboratory) => laboratory.id === user?.organization_id);
  const laboratoryOptions = selectedLaboratory || !user?.organization_id
    ? laboratories
    : [{ id: user.organization_id, name: user.organization_name || 'Active laboratory', is_active: true }, ...laboratories];

  const handleSelectionChange = async (keys: string | Set<React.Key>) => {
    const selectedKey = typeof keys === 'string' ? keys : Array.from(keys)[0];
    if (!selectedKey || String(selectedKey) === user?.organization_id) {
      return;
    }

    try {
      await switchLaboratoryContext(String(selectedKey));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to change laboratory context');
    }
  };

  const returnToPlatform = async () => {
    try {
      await switchLaboratoryContext(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to return to platform access');
    }
  };

  return (
    <div className="mx-2 mb-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-2 group-data-[collapsible=icon]:hidden">
      <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/60">
        <Building2 className="h-3.5 w-3.5" />
        Laboratory context
      </div>

      <Select
        aria-label="Select laboratory context"
        size="sm"
        selectedKeys={user?.organization_id ? new Set([user.organization_id]) : new Set()}
        placeholder={isPlatformSession ? 'Platform access' : user?.organization_name || 'Active laboratory'}
        isDisabled={isLoading || laboratoriesQuery.isLoading || !isPlatformSession}
        onSelectionChange={handleSelectionChange}
        classNames={{
          trigger: 'min-h-9 border border-sidebar-border bg-sidebar text-sidebar-foreground',
          value: 'text-xs',
          popoverContent: 'z-[100] min-w-[240px]',
        }}
        startContent={laboratoriesQuery.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
      >
        {laboratoryOptions.map((laboratory) => (
          <SelectItem
            key={laboratory.id}
            textValue={laboratory.name}
            isDisabled={laboratory.is_active === false}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="truncate">{laboratory.name}</span>
              {laboratory.is_active === false ? <span className="text-xs text-danger">Inactive</span> : null}
            </div>
          </SelectItem>
        ))}
      </Select>

      {hasLaboratoryContext ? (
        <button
          type="button"
          onClick={() => void returnToPlatform()}
          disabled={isLoading}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Return to platform access
        </button>
      ) : (
        <p className="mt-1.5 text-[11px] leading-4 text-sidebar-foreground/60">
          Select a laboratory to manage its data.
        </p>
      )}

      {laboratoriesQuery.isError ? (
        <p className="mt-1.5 text-[11px] text-danger">Laboratories could not be loaded.</p>
      ) : null}
    </div>
  );
}
