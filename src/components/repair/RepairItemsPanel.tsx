import { useMemo, useState } from 'react';
import {
  Autocomplete,
  Button,
  Card,
  Input,
  Label,
  ListBox,
  Select,
  Table,
  TextArea,
} from '@heroui/react';
import { PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { LinkedGauge } from '../../types';
import type { RepairItem, RepairItemSource } from '../../types/repair';
import { useClientInwardEntriesQuery } from '../../hooks/queries/inwards';
import { useGaugesByInwardQuery } from '../../hooks/queries/gauges';
import { useGaugeMastersWithQuery } from '../../hooks/useGaugeMastersWithQuery';
import {
  useAddRepairItemMutation,
  useDeleteRepairItemMutation,
  useUpdateRepairItemMutation,
} from '../../hooks/queries/repairs';
import { formatDateForDisplay } from '../../utils/dateAdapter';
import { formatSpecificationForPrint } from '../../utils/specificationPrintFormatter';
import { toast } from 'sonner';

interface RepairItemsPanelProps {
  repairId: string;
  clientOrgId: string;
  items: RepairItem[];
  isLocked?: boolean;
}

const emptyDirectItem = () => ({
  name: '',
  identification: '',
  serial: '',
  make: '',
  specification: '',
});

const formatItemSpecification = (specifications: RepairItem['specifications']): string => {
  if (typeof specifications.description === 'string' && specifications.description.trim()) {
    return specifications.description.trim();
  }
  return formatSpecificationForPrint(specifications);
};

export function RepairItemsPanel({ repairId, clientOrgId, items, isLocked = false }: RepairItemsPanelProps) {
  const [source, setSource] = useState<RepairItemSource>('inward');
  const [inwardId, setInwardId] = useState('');
  const [gaugeId, setGaugeId] = useState('');
  const [gaugeSearch, setGaugeSearch] = useState('');
  const [directItem, setDirectItem] = useState(emptyDirectItem);
  const [selectedMasterId, setSelectedMasterId] = useState('');
  const [description, setDescription] = useState('');
  const [repairType, setRepairType] = useState<RepairItem['repair_type']>('repair_only');
  const [repairCharge, setRepairCharge] = useState(0);
  const [additionalCharge, setAdditionalCharge] = useState(0);
  const [editingItem, setEditingItem] = useState<RepairItem | null>(null);

  const clientInwardsQuery = useClientInwardEntriesQuery(clientOrgId, { enabled: Boolean(clientOrgId) });
  const inwardGaugesQuery = useGaugesByInwardQuery(inwardId || null, { enabled: Boolean(inwardId) });
  const { gaugeMasters, loading: mastersLoading } = useGaugeMastersWithQuery();
  const addItemMutation = useAddRepairItemMutation();
  const updateItemMutation = useUpdateRepairItemMutation();
  const deleteItemMutation = useDeleteRepairItemMutation();
  const inwardGauges = useMemo(() => inwardGaugesQuery.data ?? [], [inwardGaugesQuery.data]);

  const filteredInwardGauges = useMemo(() => {
    const query = gaugeSearch.trim().toLowerCase();
    return inwardGauges.filter((gauge) => [
      gauge.master_gauge_name,
      gauge.identification_number,
      gauge.manf_serial_number,
      gauge.make,
    ].join(' ').toLowerCase().includes(query));
  }, [gaugeSearch, inwardGauges]);

  const filteredGaugeMasters = useMemo(() => {
    const query = directItem.name.trim().toLowerCase();
    return gaugeMasters.filter((gauge) => !query || gauge.name.toLowerCase().includes(query)).slice(0, 20);
  }, [directItem.name, gaugeMasters]);

  const selectedInwardGauge = useMemo(
    () => inwardGauges.find((gauge) => (
      String(gauge.id || gauge.gauge_id) === gaugeId || String(gauge.gauge_id) === gaugeId
    )),
    [gaugeId, inwardGauges],
  );
  const selectedInwardGaugeKey = selectedInwardGauge
    ? String(selectedInwardGauge.id || selectedInwardGauge.gauge_id)
    : gaugeId;

  const resetItem = () => {
    setGaugeId('');
    setGaugeSearch('');
    setDirectItem(emptyDirectItem());
    setSelectedMasterId('');
    setDescription('');
    setRepairType('repair_only');
    setRepairCharge(0);
    setAdditionalCharge(0);
    setEditingItem(null);
  };

  const saveItem = async () => {
    const existingInwardItem = editingItem?.source === 'inward'
      && editingItem.inward_id === inwardId
      && editingItem.gauge_id === gaugeId
      ? editingItem
      : null;

    if (source === 'inward' && !selectedInwardGauge && !existingInwardItem) {
      toast.error('Select a gauge from the inward');
      return;
    }
    if (source === 'direct' && !directItem.name.trim()) {
      toast.error('Gauge name is required for a direct item');
      return;
    }
    if (!description.trim()) {
      toast.error('Repair description is required');
      return;
    }

    const item = source === 'inward' && (selectedInwardGauge || existingInwardItem)
      ? {
          source,
          gauge_id: String(selectedInwardGauge?.gauge_id || existingInwardItem?.gauge_id || ''),
          master_gauge_id: selectedInwardGauge?.master_gauge_id || existingInwardItem?.master_gauge_id || undefined,
          inward_id: inwardId,
          identification_number: selectedInwardGauge?.identification_number || existingInwardItem?.identification_number || '',
          make: selectedInwardGauge?.make || existingInwardItem?.make || '',
          manf_serial_number: selectedInwardGauge?.manf_serial_number || existingInwardItem?.manf_serial_number || '',
          gauge_type: selectedInwardGauge?.master_gauge_name || selectedInwardGauge?.gauge_class || existingInwardItem?.gauge_type || '',
          specifications: (selectedInwardGauge?.specifications || existingInwardItem?.specifications || {}) as RepairItem['specifications'],
        }
      : {
          source,
          master_gauge_id: selectedMasterId || gaugeMasters.find(
            (master) => master.name.trim().toLowerCase() === directItem.name.trim().toLowerCase(),
          )?.id,
          manual_item_name: directItem.name.trim(),
          identification_number: directItem.identification.trim(),
          make: directItem.make.trim(),
          manf_serial_number: directItem.serial.trim(),
          gauge_type: directItem.name.trim(),
          specifications: directItem.specification.trim() ? { description: directItem.specification.trim() } : {},
        };

    const payload: Omit<RepairItem, 'item_id'> = {
      ...item,
      repair_type: repairType,
      repair_description: description.trim(),
      status: editingItem?.status || 'pending',
      repair_charge: repairCharge,
      additional_service_charges: additionalCharge,
      estimated_cost: repairCharge + additionalCharge,
    };

    try {
      if (editingItem) {
        await updateItemMutation.mutateAsync({ repairId, itemId: editingItem.item_id, item: payload });
        toast.success('Repair item updated');
      } else {
        await addItemMutation.mutateAsync({ repairId, item: payload });
        toast.success('Repair item added');
      }
      resetItem();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save repair item');
    }
  };

  const editItem = (item: RepairItem) => {
    setEditingItem(item);
    setSource(item.source);
    setInwardId(item.inward_id || '');
    setGaugeId(item.gauge_id || '');
    setGaugeSearch(item.gauge_type || item.manual_item_name || '');
    setSelectedMasterId(item.master_gauge_id || '');
    setDirectItem({
      name: item.manual_item_name || item.gauge_type || '',
      identification: item.identification_number || '',
      serial: item.manf_serial_number || '',
      make: item.make || '',
      specification: formatItemSpecification(item.specifications),
    });
    setDescription(item.repair_description || '');
    setRepairType(item.repair_type);
    setRepairCharge(item.repair_charge || 0);
    setAdditionalCharge(item.additional_service_charges || 0);
  };

  const removeItem = async (itemId: string) => {
    try {
      await deleteItemMutation.mutateAsync({ repairId, itemId });
      if (editingItem?.item_id === itemId) resetItem();
      toast.success('Repair item removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to remove repair item');
    }
  };

  return (
    <Card className="overflow-hidden border border-slate-200 shadow-sm">
  
      <Card.Content className="space-y-3 p-3">
        {!isLocked && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-slate-800">Item Source</Label>
                <Select value={source} onChange={(key) => {
                  setSource(String(key || 'inward') as RepairItemSource);
                  setInwardId('');
                  setGaugeId('');
                  setGaugeSearch('');
                  setDirectItem(emptyDirectItem());
                  setSelectedMasterId('');
                }}>
                  <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                  <Select.Popover><ListBox>
                    <ListBox.Item id="inward" textValue="From Inward">From Inward<ListBox.ItemIndicator /></ListBox.Item>
                    <ListBox.Item id="direct" textValue="Direct Item">Direct Item<ListBox.ItemIndicator /></ListBox.Item>
                  </ListBox></Select.Popover>
                </Select>
              </div>

              {source === 'inward' ? (
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium text-slate-800">Inward Number</Label>
                  <Select
                    placeholder={clientInwardsQuery.isLoading ? 'Loading inwards...' : 'Select inward'}
                    value={inwardId || null}
                    isDisabled={clientInwardsQuery.isLoading || clientInwardsQuery.isFetching}
                    onChange={(key) => {
                      setInwardId(key ? String(key) : '');
                      setGaugeId('');
                      setGaugeSearch('');
                    }}
                  >
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover><ListBox>
                      {(clientInwardsQuery.data ?? []).map((inward) => (
                        <ListBox.Item key={inward.id} id={inward.id} textValue={`${inward.inward_no} ${formatDateForDisplay(inward.inward_date)}`}>
                          {inward.inward_no || inward.id} - {formatDateForDisplay(inward.inward_date)}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox></Select.Popover>
                  </Select>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium text-slate-800">Gauge Name</Label>
                  <Autocomplete value={selectedMasterId || null} onChange={(key) => {
                    const masterId = key ? String(key) : '';
                    const master = gaugeMasters.find((gauge) => gauge.id === masterId);
                    setSelectedMasterId(masterId);
                    if (master) setDirectItem((current) => ({ ...current, name: master.name }));
                  }}>
                    <Autocomplete.Trigger>
                      <Autocomplete.Filter><Input value={directItem.name} onChange={(event) => {
                        const value = event.target.value;
                        const selectedMaster = gaugeMasters.find((gauge) => gauge.id === selectedMasterId);
                        if (selectedMaster?.name !== value) setSelectedMasterId('');
                        setDirectItem((current) => ({ ...current, name: value }));
                      }} placeholder={mastersLoading ? 'Loading gauges...' : 'Enter or select gauge name'} /></Autocomplete.Filter>
                      <Autocomplete.Indicator />
                    </Autocomplete.Trigger>
                    <Autocomplete.Popover><ListBox>
                      {filteredGaugeMasters.map((gauge) => (
                        <ListBox.Item key={gauge.id} id={gauge.id} textValue={gauge.name}>
                          {gauge.name}<ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox></Autocomplete.Popover>
                  </Autocomplete>
                </div>
              )}

              {source === 'inward' && (
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium text-slate-800">Gauge Name</Label>
                  <Autocomplete
                    value={selectedInwardGaugeKey || null}
                    isDisabled={!inwardId || inwardGaugesQuery.isLoading || inwardGaugesQuery.isFetching}
                    onChange={(key) => {
                      const nextGaugeId = key ? String(key) : '';
                      setGaugeId(nextGaugeId);
                      const gauge = inwardGauges.find((entry) => String(entry.id || entry.gauge_id) === nextGaugeId);
                      if (gauge) setGaugeSearch(gauge.master_gauge_name || gauge.gauge_class || 'Gauge');
                    }}
                  >
                    <Autocomplete.Trigger>
                      <Autocomplete.Filter><Input value={gaugeSearch} onChange={(event) => setGaugeSearch(event.target.value)} placeholder={inwardId ? 'Search or select gauge' : 'Select inward first'} /></Autocomplete.Filter>
                      <Autocomplete.Indicator />
                    </Autocomplete.Trigger>
                    <Autocomplete.Popover><ListBox>
                      {filteredInwardGauges.map((gauge: LinkedGauge) => {
                        const id = String(gauge.id || gauge.gauge_id);
                        return (
                          <ListBox.Item key={id} id={id} textValue={`${gauge.master_gauge_name} ${gauge.identification_number} ${gauge.manf_serial_number}`}>
                            <div className="flex flex-col">
                              <span>{gauge.master_gauge_name || 'Gauge'} - {gauge.identification_number || 'No identification'}</span>
                              <span className="text-xs text-slate-500">Serial: {gauge.manf_serial_number || '-'} · Make: {gauge.make || '-'}</span>
                            </div>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        );
                      })}
                    </ListBox></Autocomplete.Popover>
                  </Autocomplete>
                </div>
              )}
            </div>

            {source === 'direct' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-800">Identification<Input value={directItem.identification} onChange={(event) => setDirectItem((current) => ({ ...current, identification: event.target.value }))} /></label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-800">Serial Number<Input value={directItem.serial} onChange={(event) => setDirectItem((current) => ({ ...current, serial: event.target.value }))} /></label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-800">Make<Input value={directItem.make} onChange={(event) => setDirectItem((current) => ({ ...current, make: event.target.value }))} /></label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-800">Specification<Input value={directItem.specification} onChange={(event) => setDirectItem((current) => ({ ...current, specification: event.target.value }))} /></label>
              </div>
            )}

            {selectedInwardGauge && (
              <div className="grid grid-cols-1 gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm md:grid-cols-2">
                <span><strong>Specification:</strong> {formatItemSpecification((selectedInwardGauge.specifications || {}) as RepairItem['specifications'])}</span>
                <span><strong>Serial:</strong> {selectedInwardGauge.manf_serial_number || '-'} · <strong>Make:</strong> {selectedInwardGauge.make || '-'}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-slate-800">Process Type</Label>
                <Select value={repairType} onChange={(key) => setRepairType(String(key || 'repair_only') as RepairItem['repair_type'])}>
                  <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                  <Select.Popover><ListBox>
                    <ListBox.Item id="repair_only" textValue="Repair Only">Repair Only<ListBox.ItemIndicator /></ListBox.Item>
                    <ListBox.Item id="repair_and_calibration" textValue="Repair and Calibration">Repair and Calibration<ListBox.ItemIndicator /></ListBox.Item>
                  </ListBox></Select.Popover>
                </Select>
              </div>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-800">Repair Description<TextArea rows={2} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the repair needed" /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-800">Repair Charges<Input type="number" min="0" value={String(repairCharge)} onChange={(event) => setRepairCharge(Number(event.target.value) || 0)} /></label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-800">Additional Charges<Input type="number" min="0" value={String(additionalCharge)} onChange={(event) => setAdditionalCharge(Number(event.target.value) || 0)} /></label>
            </div>

            <div className="flex justify-end gap-2">
              {editingItem && <Button variant="secondary" onPress={resetItem}>Cancel Edit</Button>}
              <Button variant="primary" onPress={saveItem} isDisabled={addItemMutation.isPending || updateItemMutation.isPending}>
                {!editingItem && <PlusIcon className="h-4 w-4" />}
                {addItemMutation.isPending || updateItemMutation.isPending ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
              </Button>
            </div>
          </div>
        )}

        <Table aria-label="Repair draft items">
          <Table.ScrollContainer><Table.Content>
            <Table.Header>
              <Table.Column id="item" isRowHeader>ITEM</Table.Column>
              <Table.Column id="source">SOURCE</Table.Column>
              <Table.Column id="specification">SPECIFICATION</Table.Column>
              <Table.Column id="status">STATUS</Table.Column>
              <Table.Column id="cost">EST. COST</Table.Column>
              <Table.Column id="actions">ACTIONS</Table.Column>
            </Table.Header>
            <Table.Body items={items} renderEmptyState={() => <div className="py-8 text-center text-sm text-slate-500">No repair items added yet.</div>}>
              {(item) => (
                <Table.Row id={item.item_id}>
                  <Table.Cell><div className="font-medium">{item.gauge_type || item.manual_item_name || 'Gauge'}</div><div className="text-xs text-slate-500">{item.identification_number || item.manf_serial_number || '-'}</div></Table.Cell>
                  <Table.Cell>{item.source === 'inward' ? 'Inward' : 'Direct'}</Table.Cell>
                  <Table.Cell>{formatItemSpecification(item.specifications)}</Table.Cell>
                  <Table.Cell>{item.status.replaceAll('_', ' ')}</Table.Cell>
                  <Table.Cell>₹{item.estimated_cost.toFixed(2)}</Table.Cell>
                  <Table.Cell>
                    {!isLocked ? <div className="flex gap-1">
                      <Button isIconOnly size="sm" variant="ghost" aria-label="Edit repair item" onPress={() => editItem(item)}><PencilSquareIcon className="h-4 w-4" /></Button>
                      <Button isIconOnly size="sm" variant="danger-soft" aria-label="Remove repair item" onPress={() => removeItem(item.item_id)} isDisabled={deleteItemMutation.isPending}><TrashIcon className="h-4 w-4" /></Button>
                    </div> : '-'}
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Content></Table.ScrollContainer>
        </Table>
      </Card.Content>
    </Card>
  );
}
