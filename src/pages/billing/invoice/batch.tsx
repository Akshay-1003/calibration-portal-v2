import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@heroui/react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { PageMeta } from '../../../components/common/PageMeta';
import { InvoiceEditor, type InvoiceEditorHandle } from './edit';
import { addPoInvoiceItem, retryPoBatch, usePoBatch } from '../../../hooks/queries/poInvoicing';
import { queryKeys } from '../../../hooks/queries/queryKeys';

export default function PoInvoiceBatchPage() {
  const { batchId = '' } = useParams<{ batchId: string }>();
  const query = usePoBatch(batchId);
  const client = useQueryClient();
  const navigate = useNavigate();
  const [selectedPo, setSelectedPo] = useState('');
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editorEpoch, setEditorEpoch] = useState(0);
  const editor = useRef<InvoiceEditorHandle>(null);
  const batch = query.data;
  const activePo = selectedPo || batch?.groups[0]?.po_id || '';
  const active = batch?.groups.find(group => group.po_id === activePo);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);
  const reload = () => {
    void client.invalidateQueries({ queryKey: ['po-batch', batchId] });
    void client.invalidateQueries({ queryKey: ['billing-availability'] });
    void client.invalidateQueries({ queryKey: queryKeys.outwards.all });
  };
  const switchTo = (poId: string) => {
    setDirty(false); setPendingTab(null);
    if (poId === '__back__') navigate('/billing/invoice'); else setSelectedPo(poId);
  };
  const requestSwitch = (poId: string) => {
    if (poId === activePo) return;
    if (dirty) setPendingTab(poId); else switchTo(poId);
  };
  const saveAndSwitch = async () => {
    setBusy(true);
    try { if (await editor.current?.save()) switchTo(pendingTab!); }
    finally { setBusy(false); }
  };
  const retry = async () => {
    setBusy(true);
    try { await retryPoBatch(batchId); reload(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to retry drafts'); }
    finally { setBusy(false); }
  };
  const addItem = async (sourceKey: string, priceListItemId: string) => {
    if (!active?.invoice?.id || dirty) { toast.error('Save or discard current edits before adding an item.'); return; }
    setBusy(true);
    try {
      const invoice = await addPoInvoiceItem(active.invoice.id, { source_key: sourceKey, po_id: active.po_id, price_list_item_id: priceListItemId }, active.invoice.revision ?? 0);
      client.setQueryData(queryKeys.invoices.detail(active.invoice.id), invoice);
      setEditorEpoch(value => value + 1); reload();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Item could not be added'); }
    finally { setBusy(false); }
  };

  if (query.isLoading) return <p>Loading PO invoices…</p>;
  if (query.error) return <p role="alert" className="text-red-600">{query.error.message}</p>;
  if (!batch) return <p>Invoice batch not found.</p>;
  const counts = batch.summary;
  return <div className="space-y-4">
    <PageMeta title="PO Invoice Drafts" />
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-semibold">PO invoice review</h1><Button variant="outline" onClick={() => requestSwitch('__back__')}>Back to invoices</Button></div>
      <p className="mt-2 text-sm">{counts.selected} selected · {counts.draft} in drafts · {counts.invoiced} invoiced · {counts.pending} pending · {counts.elsewhere} in other invoices</p>
      <p className="mt-1 text-xs text-slate-500">Drafts reserve their items. Service components do not increase the item count.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{batch.groups.map(group => <div key={group.po_id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
        <strong>{group.po_number}</strong>: {group.invoice?.invoice_details.billing_items.length ?? group.expected_count} items · {group.invoice?.invoice_number || 'Not created'} · {group.invoice?.archived ? 'Deleted' : group.invoice?.status || 'Failed'}
        <details className="mt-2"><summary className="cursor-pointer text-xs text-blue-700">View allocated items</summary><ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs text-slate-600">
          {batch.rows.filter(row => row.allocation?.po_id === group.po_id || Boolean(group.invoice?.id && row.owner?.invoice_id === group.invoice.id)).map(row => <li key={row.source_key}>{row.item.master_gauge_name} · {row.item.identification_number || row.source_key}</li>)}
        </ul></details>
      </div>)}</div>
      {batch.groups.some(group => !group.invoice) && <Button className="mt-3" disabled={busy} onClick={() => void retry()}>Retry failed groups</Button>}
    </div>
    {batch.rows.some(row => !row.owner && row.status !== 'excluded') && <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      <h2 className="font-semibold text-amber-900">Items still pending</h2>
      <p className="mt-1 text-sm text-amber-800">Select an eligible PO tab below to add an item. If no PO option exists, update its Rate Card mapping first.</p>
      <ul className="mt-2 space-y-1 text-sm">{batch.rows.filter(row => !row.owner && row.status !== 'excluded').map(row => <li key={row.source_key}>{row.item.master_gauge_name} · {row.item.identification_number || row.source_key} · {row.options.length ? row.options.map(option => option.po_number).join(', ') : 'No matching PO'}</li>)}</ul>
    </div>}
    <div role="tablist" aria-label="Invoices by PO" className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">
      {batch.groups.map(group => <button key={group.po_id} type="button" role="tab" aria-selected={activePo === group.po_id} disabled={busy} onClick={() => requestSwitch(group.po_id)} className={`shrink-0 rounded-md px-3 py-2 text-sm ${activePo === group.po_id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
        {group.po_number} · {group.invoice?.invoice_details.billing_items.length ?? group.expected_count} · {group.invoice?.archived ? 'Deleted' : group.invoice?.status || 'Failed'}
      </button>)}
    </div>
    {active?.error && <p role="alert" className="text-red-600">{active.error}</p>}
    {active?.invoice?.archived ? <p>This draft was deleted. Its items are available again; retrying will not recreate it.</p> : active?.invoice?.id && <>
      {active.invoice.status === 'draft' && <details className="rounded-lg border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-medium">Add released or pending items to {active.po_number}</summary>
        <p className="my-2 text-xs text-slate-500">Remove and save an item in its original draft before adding it here.</p>
        {batch.rows.filter(row => !row.owner).flatMap(row => row.options.filter(option => option.po_id === active.po_id).map(option => <div key={`${row.source_key}:${option.price_list_item_id}`} className="flex items-center justify-between gap-3 border-t py-2 text-sm">
          <span>{row.item.master_gauge_name} · {row.item.identification_number} · {option.label}</span>
          <Button size="sm" variant="outline" disabled={dirty || busy} onClick={() => void addItem(row.source_key, option.price_list_item_id)}>Add item</Button>
        </div>))}
      </details>}
      <InvoiceEditor key={`${active.invoice.id}:${editorEpoch}`} invoiceId={active.invoice.id} controlRef={editor}
        onSaved={reload} onGenerated={reload} onCancel={() => requestSwitch('__back__')} onDirtyChange={setDirty} />
    </>}
    <Modal.Root isOpen={pendingTab !== null} onOpenChange={open => { if (!open && !busy) setPendingTab(null); }}>
      <Modal.Backdrop><Modal.Container size="md"><Modal.Dialog>
        <Modal.Header><Modal.Heading>Unsaved invoice changes</Modal.Heading></Modal.Header>
        <Modal.Body>Save or discard this invoice’s changes before switching.</Modal.Body>
        <Modal.Footer>
          <Button variant="outline" disabled={busy} onClick={() => setPendingTab(null)}>Stay</Button>
          <Button variant="outline" disabled={busy} onClick={() => switchTo(pendingTab!)}>Discard and switch</Button>
          <Button disabled={busy} onClick={() => void saveAndSwitch()}>Save and switch</Button>
        </Modal.Footer>
      </Modal.Dialog></Modal.Container></Modal.Backdrop>
    </Modal.Root>
  </div>;
}
