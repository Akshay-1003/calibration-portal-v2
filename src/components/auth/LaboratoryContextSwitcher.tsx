import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../features/auth';
import { useAuthStore } from '../../features/auth/store/authStore';
import { decodeCalibrationAccessToken } from '../../features/auth/utils/calibrationToken';

export function LaboratoryContextSwitcher() {
  const { user, switchLaboratoryContext } = useAuth();
  const accessToken = useAuthStore((state) => state.accessToken);
  const isLoading = useAuthStore((state) => state.isLoading);
  const restoreRequestedRef = useRef(false);
  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'superadmin';
  const tokenScope = accessToken ? decodeCalibrationAccessToken(accessToken)?.scope : undefined;

  useEffect(() => {
    if (!isSuperAdmin || isLoading) return;

    if (tokenScope !== 'laboratory') {
      restoreRequestedRef.current = false;
      return;
    }

    if (restoreRequestedRef.current) return;
    restoreRequestedRef.current = true;

    void switchLaboratoryContext(null).catch((error) => {
      restoreRequestedRef.current = false;
      toast.error(error instanceof Error ? error.message : 'Unable to restore platform access');
    });
  }, [isLoading, isSuperAdmin, switchLaboratoryContext, tokenScope]);

  return null;
}
