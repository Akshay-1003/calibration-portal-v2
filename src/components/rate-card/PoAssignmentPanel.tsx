import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { useCustomerPos, useSaveCustomerPo } from '../../hooks/queries/poInvoicing';
import { Calendar, DateField, DatePicker, FieldError, Checkbox, Input, Label, ListBox, Modal, Select, TextField } from '@heroui/react';
import { parseDate } from '@internationalized/date';

export function PoAssignmentPanel({ customerId, selectedIds, onAssigned }: { customerId: string; selectedIds: string[]; onAssigned: () => void }) {
  const pos = useCustomerPos(customerId);
  const save = useSaveCustomerPo(customerId);
  const [open, setOpen] = useState(false);
  const [poId, setPoId] = useState('new');
  const [number, setNumber] = useState('');
  const [date, setDate] = useState('');
  const [closed, setClosed] = useState(false);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const existing = pos.data?.items.find(po => po.id === poId);
  const mappedIds = [...new Set([...(existing?.lines.map(line => line.price_list_item_id) ?? []), ...selectedIds])].filter(id => !removedIds.includes(id));

  const choosePo = (id: string) => {
    const po = pos.data?.items.find(item => item.id === id);
    setPoId(id); setNumber(po?.po_number ?? ''); setDate(po?.po_date ?? '');
    setClosed(po?.status === 'closed'); setRemovedIds([]);
  };
  const submit = async () => {
    try {
      await save.mutateAsync({
        id: existing?.id, po_number: number.trim(), po_date: date,
        status: closed ? 'closed' : 'active', price_list_item_ids: mappedIds
      });
      toast.success('PO mappings saved'); setOpen(false); onAssigned();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save PO mappings'); }
  };

  return <>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-slate-600">{selectedIds.length} Rate Card entries selected</span>
      <Button type="button" variant="outline" disabled={(!selectedIds.length && !pos.data?.items.length) || pos.isLoading || !pos.data} onClick={() => { choosePo(selectedIds.length ? 'new' : pos.data?.items[0]?.id ?? 'new'); setOpen(true); }}>Assign / Manage PO</Button>
    </div>
    <div className="flex flex-wrap gap-2" aria-label="Saved purchase orders">
      {pos.data?.items.map(po => <Button key={po.id} type="button" variant="outline" onClick={() => { choosePo(po.id); setOpen(true); }} aria-label={`Edit PO ${po.po_number}`}>
        Edit {po.po_number} · {po.status}
      </Button>)}
    </div>
    {pos.error && <p role="alert" className="text-sm text-red-600">{pos.error.message}</p>}
    <Modal.Root isOpen={open} onOpenChange={setOpen}>
      <Modal.Backdrop><Modal.Container size="lg" scroll="inside"><Modal.Dialog>
        <Modal.Header><Modal.Heading>Assign Rate Card entries to PO</Modal.Heading></Modal.Header>
        <Modal.Body className="space-y-4">
          <Select className="w-full" placeholder="Select a PO" value={poId} onChange={key => key != null && choosePo(String(key))}>
            <Label>Customer PO</Label>
            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="new" textValue="Create new PO">Create new PO<ListBox.ItemIndicator /></ListBox.Item>
                {pos.data?.items.map(po => (
                  <ListBox.Item key={po.id} id={po.id} textValue={po.po_number}>{po.po_number}<ListBox.ItemIndicator /></ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <TextField isRequired value={number} onChange={setNumber}>
            <Label>PO Number</Label>
            <Input placeholder="Enter PO number" />
            <FieldError />
          </TextField>
          <DatePicker
            isRequired
            className="w-full"
            value={date ? parseDate(date.slice(0, 10)) : null}
            onChange={(value) => setDate(value ? value.toString() : '')}
          >
            <Label>PO Date</Label>
            <DateField.Group fullWidth>
              <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
              <DateField.Suffix>
                <DatePicker.Trigger>
                  <DatePicker.TriggerIndicator />
                </DatePicker.Trigger>
              </DateField.Suffix>
            </DateField.Group>
            <DatePicker.Popover>
              <Calendar aria-label="PO date">
                <Calendar.Header>
                  <Calendar.Heading />
                  <Calendar.NavButton slot="previous" />
                  <Calendar.NavButton slot="next" />
                </Calendar.Header>
                <Calendar.Grid>
                  <Calendar.GridHeader>{(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}</Calendar.GridHeader>
                  <Calendar.GridBody>{(d) => <Calendar.Cell date={d} />}</Calendar.GridBody>
                </Calendar.Grid>
              </Calendar>
            </DatePicker.Popover>
          </DatePicker>

          <Select className="w-full" placeholder="Select status" value={closed ? 'closed' : 'active'} onChange={key => setClosed(key === 'closed')}>
            <Label>Status</Label>
            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="active" textValue="Active">Active<ListBox.ItemIndicator /></ListBox.Item>
                <ListBox.Item id="closed" textValue="Closed">Closed<ListBox.ItemIndicator /></ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>

          <Checkbox
            id="closed-po" isSelected={closed} onChange={setClosed}>
               <Checkbox.Content>
                      <Checkbox.Control className="bg-blue-50 border border-blue-200 rounded-md before:bg-primary">
              <Checkbox.Indicator />
            </Checkbox.Control>
           
              Closed PO
            </Checkbox.Content>
          </Checkbox>

          {existing && <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
              <p className="text-sm font-medium text-slate-700">{mappedIds.length} Existing mappings</p>
              
            </div>
            <div className="max-h-56 divide-y divide-slate-100 overflow-auto" aria-label="Existing PO mappings">
              {existing.lines.map(line => (
                <div key={line.id} className="px-4 py-2.5 transition-colors hover:bg-slate-50 flex items-center gap-2">


                  <Checkbox
                    className="flex items-center gap-2"
                    id={`line-${line.id}`}
                    isSelected={!removedIds.includes(line.price_list_item_id)}
                    onChange={keep =>
                      setRemovedIds(ids =>
                        keep ? ids.filter(id => id !== line.price_list_item_id) : [...ids, line.price_list_item_id]
                      )
                    }
                  >
                    <Checkbox.Content>
                      <Checkbox.Control className="bg-blue-50 border border-blue-200 rounded-md before:bg-primary">
                        <Checkbox.Indicator className="**:data-[slot=checkbox-default-indicator--checkmark]:text-primary-foreground" />
                      </Checkbox.Control>
                      {line.description}
                    </Checkbox.Content>
                  </Checkbox>
                </div>
              ))}
            </div>
          </div>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={save.isPending || !number.trim() || !date || (!existing && !mappedIds.length)}>{save.isPending ? 'Saving...' : 'Save mappings'}</Button>
        </Modal.Footer>
      </Modal.Dialog></Modal.Container></Modal.Backdrop>
    </Modal.Root>
  </>;
}