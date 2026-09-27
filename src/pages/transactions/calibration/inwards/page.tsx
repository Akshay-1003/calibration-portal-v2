import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../../components/ui/button';
import { CalibrationInwardTable } from '../../../../components/Tables/CalibrationInwardTable';
import { InwardEntry } from '../../../../types';
import { TablePageWrapper } from '../../../../components/layout/TablePageWrapper';
import { useInwardEntriesListQuery } from '../../../../hooks/queries/inwards';
import { useNavigation } from '../../../../context/NavigationContext';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../hooks/queries/queryKeys';
import { useAuth } from '../../../../features/auth';

const CalibrationInwardPage = React.memo(() => {
  const navigate = useNavigate();
  const { startLoading } = useNavigation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const hasLaboratoryContext = Boolean(user?.organization_id);
  const inwardsQuery = useInwardEntriesListQuery(undefined, { enabled: hasLaboratoryContext });
  const allInwardEntries = inwardsQuery.data?.items ?? [];
  const loading = inwardsQuery.isLoading || inwardsQuery.isFetching;
  const error = inwardsQuery.error ? (inwardsQuery.error as Error).message : null;
  const { refetch } = inwardsQuery;

  // Handle calibration button click - navigate to calibration page with inward ID
  const handleCalibrationClick = useCallback((entry: InwardEntry) => {
    // Navigate to calibration page with inward ID as URL parameter
    startLoading(`/transactions/calibration/${entry.id}`);
    navigate(`/transactions/calibration/${entry.id}`);
  }, [navigate, startLoading]);

  // Handle refresh inward entries - memoized
  const handleRefreshInwards = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.inwards.lists(),
      refetchType: "none",
    });
    await refetch();
  }, [queryClient, refetch]);

  return (
    <TablePageWrapper
      title="Calibration Management"
      description="Select an inward entry to view and calibrate its gauges"
      actions={
        <Button 
          onClick={handleRefreshInwards}
          variant="outline"
          className="flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </Button>
      }
    >
      {hasLaboratoryContext ? (
        <div className="w-full">
          <CalibrationInwardTable
            loading={loading}
            error={error}
            data={allInwardEntries}
            onRefresh={handleRefreshInwards}
            onCalibrationClick={handleCalibrationClick}
          />
        </div>
      ) : (
        <div className="flex min-h-48 items-center justify-center rounded-md border border-amber-200 bg-amber-50 px-6 text-center text-sm font-medium text-amber-800">
          Select a laboratory to view and manage calibration work.
        </div>
      )}
    </TablePageWrapper>
  );
});

CalibrationInwardPage.displayName = 'CalibrationInwardPage';

export default CalibrationInwardPage;
