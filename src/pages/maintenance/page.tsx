'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@heroui/react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { RepairTable } from '../../components/Tables/RepairTable';
import { useOrganizations } from '../../hooks/useOrganizations';
import {
  mapRepairApiToRepairEntry,
  useDeleteRepairMutation,
  useRepairsQuery,
} from '../../hooks/queries/repairs';
import { logger } from '../../utils/logger';
import { toast } from 'sonner';
import type { RepairEntry, RepairTableHandlers, RepairTableState } from '../../types/repair';

const RepairPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { organizations, loading: organizationsLoading } = useOrganizations('customers');

  const repairsQuery = useRepairsQuery();
  const deleteRepairMutation = useDeleteRepairMutation();

  const [tableState, setTableState] = useState<Omit<RepairTableState, 'data' | 'loading' | 'error'>>({
    page: 1,
    rowsPerPage: 10,
    selectedKeys: new Set(),
    sortDescriptor: {
      column: 'repair_date',
      direction: 'descending',
    },
    searchValue: '',
    clientOrgId: '',
    repairType: '',
    repairStatus: '',
    dateFrom: '',
    dateTo: '',
  });

  const organizationNameMap = useMemo(() => {
    return organizations.reduce<Record<string, string>>((acc, organization) => {
      acc[organization.id] = organization.name;
      return acc;
    }, {});
  }, [organizations]);

  const repairsData = useMemo(() => {
    return (repairsQuery.data || [])
      .map((repair) => {
        const clientOrgId = String(repair.client_org_id || '');
        return mapRepairApiToRepairEntry(repair, organizationNameMap[clientOrgId]);
      })
      .filter((repair) => Boolean(repair.id));
  }, [repairsQuery.data, organizationNameMap]);

  const resolvedState: RepairTableState = useMemo(
    () => ({
      ...tableState,
      data: repairsData,
      loading: repairsQuery.isLoading || repairsQuery.isFetching,
      error: repairsQuery.isError
        ? repairsQuery.error instanceof Error
          ? repairsQuery.error.message
          : 'Failed to load repairs'
        : null,
    }),
    [tableState, repairsData, repairsQuery.isLoading, repairsQuery.isFetching, repairsQuery.isError, repairsQuery.error]
  );

  const handleCreateRepair = useCallback(() => {
    navigate('/maintenance/create');
  }, [navigate]);

  const handleEdit = useCallback(
    (repair: RepairEntry) => {
      const returnTo = `${location.pathname}${location.search}`;
      navigate(`/maintenance/edit/${repair.id}?returnTo=${encodeURIComponent(returnTo)}`);
    },
    [location.pathname, location.search, navigate]
  );

  const handleDelete = useCallback(
    async (repair: RepairEntry) => {
      try {
        await deleteRepairMutation.mutateAsync(repair.id);
        toast.success('Repair deleted successfully');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete repair';
        toast.error(message);
      }
    },
    [deleteRepairMutation]
  );

  const handleView = useCallback((repair: RepairEntry) => {
    logger.info('View repair:', repair);
    toast.info('View screen is not configured yet');
  }, []);

  const handleRefresh = useCallback(async () => {
    await repairsQuery.refetch();
  }, [repairsQuery]);

  const handlePageChange = useCallback((page: number) => {
    setTableState((prev) => ({ ...prev, page }));
  }, []);

  const handleRowsPerPageChange = useCallback((rowsPerPage: number) => {
    setTableState((prev) => ({ ...prev, rowsPerPage, page: 1 }));
  }, []);

  const handleSearchChange = useCallback((searchValue: string) => {
    setTableState((prev) => ({ ...prev, searchValue, page: 1 }));
  }, []);

  const handleSearchClear = useCallback(() => {
    setTableState((prev) => ({ ...prev, searchValue: '', page: 1 }));
  }, []);

  const handleSortChange = useCallback((sortDescriptor: RepairTableState['sortDescriptor']) => {
    setTableState((prev) => ({ ...prev, sortDescriptor, page: 1 }));
  }, []);

  const handleSelectionChange = useCallback((selectedKeys: Set<string>) => {
    setTableState((prev) => ({ ...prev, selectedKeys }));
  }, []);

  const handleClientOrgChange = useCallback((clientOrgId: string) => {
    setTableState((prev) => ({ ...prev, clientOrgId, page: 1 }));
  }, []);

  const handleRepairTypeChange = useCallback((repairType: string) => {
    setTableState((prev) => ({ ...prev, repairType, page: 1 }));
  }, []);

  const handleRepairStatusChange = useCallback((repairStatus: string) => {
    setTableState((prev) => ({ ...prev, repairStatus, page: 1 }));
  }, []);

  const handleDateFromChange = useCallback((dateFrom: string) => {
    setTableState((prev) => ({ ...prev, dateFrom, page: 1 }));
  }, []);

  const handleDateToChange = useCallback((dateTo: string) => {
    setTableState((prev) => ({ ...prev, dateTo, page: 1 }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    toast.success('Filters applied');
  }, []);

  const handleClearFilters = useCallback(() => {
    setTableState((prev) => ({
      ...prev,
      clientOrgId: '',
      repairType: '',
      repairStatus: '',
      dateFrom: '',
      dateTo: '',
      page: 1,
    }));
  }, []);

  const tableHandlers: RepairTableHandlers = {
    onPageChange: handlePageChange,
    onRowsPerPageChange: handleRowsPerPageChange,
    onSearchChange: handleSearchChange,
    onSearchClear: handleSearchClear,
    onSortChange: handleSortChange,
    onSelectionChange: handleSelectionChange,
    onClientOrgChange: handleClientOrgChange,
    onRepairTypeChange: handleRepairTypeChange,
    onRepairStatusChange: handleRepairStatusChange,
    onDateFromChange: handleDateFromChange,
    onDateToChange: handleDateToChange,
    onApplyFilters: handleApplyFilters,
    onClearFilters: handleClearFilters,
    onCreateRepair: handleCreateRepair,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onView: handleView,
    onRefresh: handleRefresh,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repair Management</h1>
          <p className="text-gray-600">Manage instrument repairs and maintenance</p>
        </div>
        <Button variant="primary" onPress={handleCreateRepair}>
          <PlusIcon className="h-4 w-4" />
          Create Repair
        </Button>
      </div>

      <RepairTable
        state={resolvedState}
        handlers={tableHandlers}
        organizations={organizations}
        organizationsLoading={organizationsLoading}
      />
    </div>
  );
};

export default RepairPage;
