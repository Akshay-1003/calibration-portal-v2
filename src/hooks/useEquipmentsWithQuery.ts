/**
 * Enhanced Equipments Hook with TanStack Query
 *
 * Uses TanStack Query for server data management.
 */

import { useMemo } from 'react';
import {
  useEquipmentsQuery,
  useCreateEquipmentMutation,
  useUpdateEquipmentMutation,
  useDeleteEquipmentMutation,
} from './queries/equipments';
import type { EquipmentData } from '../types/equipment';

/**
 * Enhanced hook that uses TanStack Query
 */
export function useEquipmentsWithQuery() {
  const query = useEquipmentsQuery();

  const createMutation = useCreateEquipmentMutation();
  const updateMutation = useUpdateEquipmentMutation();
  const deleteMutation = useDeleteEquipmentMutation();

  const createEquipment = async (data: Partial<EquipmentData>) => {
    const result = await createMutation.mutateAsync(data);
    return result;
  };

  const updateEquipment = async (equipmentId: string, data: Partial<EquipmentData>) => {
    const result = await updateMutation.mutateAsync({ id: equipmentId, data });
    return result;
  };

  const deleteEquipment = async (equipmentId: string) => {
    await deleteMutation.mutateAsync(equipmentId);
  };

  const fetchEquipments = async (forceRefresh?: boolean) => {
    if (forceRefresh) {
      await query.refetch();
    }
  };

  const refreshEquipments = async () => {
    await query.refetch();
  };

  const equipments = query.data ?? [];

  const getEquipmentById = useMemo(
    () => (id: string) => equipments.find((equipment) => equipment.id === id),
    [equipments]
  );

  const getUniqueValues = useMemo(
    () => (field: keyof EquipmentData) => {
      const values = equipments
        .map((equipment) => equipment[field])
        .filter((value): value is string => Boolean(value) && typeof value === 'string')
        .filter((value, index, array) => array.indexOf(value) === index)
        .sort();
      return values;
    },
    [equipments]
  );

  const getEquipmentStats = useMemo(() => {
    const total = equipments.length;
    const withRanges = equipments.filter((eq) => eq.ranges && eq.ranges.length > 0).length;
    const uniqueMakes = new Set(equipments.map((eq) => eq.make).filter(Boolean)).size;
    const uniqueLocations = new Set(equipments.map((eq) => eq.equipment_location).filter(Boolean)).size;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAdditions = equipments.filter((eq) =>
      eq.created_at && new Date(eq.created_at) > thirtyDaysAgo
    ).length;
    const needsAttention = equipments.filter((eq) =>
      !eq.serial_no || !eq.make || !eq.equipment_location || !eq.cal_agency
    ).length;

    return {
      total,
      withRanges,
      uniqueMakes,
      uniqueLocations,
      recentAdditions,
      needsAttention,
    };
  }, [equipments]);

  return {
    equipments,
    loading: query.isLoading || query.isFetching,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ? (query.error as Error).message : null,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    fetchEquipments,
    refreshEquipments,
    refetch: query.refetch,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    getEquipmentById,
    getUniqueValues,
    getEquipmentStats,
  };
}
