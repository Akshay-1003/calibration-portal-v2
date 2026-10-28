import { RateCardBulkEditor } from '../../../components/rate-card/RateCardBulkEditor';
import { useParams, useNavigate } from 'react-router-dom';
import { RateCardForm } from '../../../components/rate-card/RateCardForm';
import { RateCardTable } from '../../../components/Tables/RateCardTable';
import { PoAssignmentPanel } from '../../../components/rate-card/PoAssignmentPanel';
import { useCustomerPos } from '../../../hooks/queries/poInvoicing';
import { Button } from '../../../components/ui/button';
import { Card } from '@heroui/react';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { 
  useRateCardEntries, 
  useAddRateCardEntry, 
  useAddRateCardEntries,
  useUpdateRateCardEntry,
  useUpdateGaugeRates,
  useDeleteRateCardEntry,
  usePreviewRateCardImport,
  useConfirmRateCardImport,
  type RateCardEntryWithId 
} from '../../../hooks/useRateCard';
import { useMasterDataStore } from '../../../store/useStore';
import { PageMeta } from '../../../components/common/PageMeta';
import {
  downloadRateCardTemplate,
  type RateCardImportResult,
} from '../../../services/apiServices';

export interface RateCardEntry {
  price_list_item_id?: string;
  rate_type: 'discount' | 'discounted' | 'flat' | string;
  range: {
    min: number;
    max: number;
  };
  description: string;
  rate: number;
  discount: number;
  unit: string;
  range_unit?: string;
  standard_specification?: string;
  basic_size?: number;
  least_count?: number;
}

const RateCardPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [editingEntries, setEditingEntries] = useState<RateCardEntryWithId[] | null>(null);
  const bulkUpdateMutation = useUpdateGaugeRates(id);
  const [selectedEntry, setSelectedEntry] = useState<RateCardEntry | null>(null);
  const [selectedRateIds, setSelectedRateIds] = useState<Set<string>>(new Set());
  useEffect(() => setSelectedRateIds(new Set()), [id]);
  const [isEditing, setIsEditing] = useState(false);
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<RateCardImportResult | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  // Store internal tracking data (not in RateCardEntry interface)
  const [internalEntryData, setInternalEntryData] = useState<{ id?: string; price_list_item_id?: string; gauge_id?: string; gauge_name?: string } | null>(null);
  
  // Fetch gauge masters to ensure gauge names are available
  const { gaugeMasterList, fetchGaugeMasters } = useMasterDataStore();
  
  useEffect(() => {
    if (gaugeMasterList.length === 0) {
      fetchGaugeMasters();
    }
  }, [gaugeMasterList.length, fetchGaugeMasters]);
  
  // TanStack Query hooks
  const { data: flattenedEntries = [], isLoading } = useRateCardEntries(id);
  const customerPos = useCustomerPos(id);
  const addMutation = useAddRateCardEntry(id);
  const addManyMutation = useAddRateCardEntries(id);
  const updateMutation = useUpdateRateCardEntry(id);
  const deleteMutation = useDeleteRateCardEntry(id);
  const previewImportMutation = usePreviewRateCardImport(id);
  const confirmImportMutation = useConfirmRateCardImport(id);

  // Get entries for current organization
  // Transform RateCardEntryWithId to RateCardEntry with internal tracking data
  const rateCardEntries = useMemo(() => {
    return flattenedEntries.map(entry => {
      const { id: entryId, gauge_id, gauge_name, ...rateCardEntry } = entry;
      // Attach internal data for edit/delete operations (not part of interface)
      return {
        ...rateCardEntry,
        _internalId: entryId,
        _internalGaugeId: gauge_id,
        _internalGaugeName: gauge_name,
      } as RateCardEntry & { _internalId?: string; _internalGaugeId?: string; _internalGaugeName?: string };
    });
  }, [flattenedEntries]);
  const poLabels = useMemo(() => Object.fromEntries(rateCardEntries.map(entry => [
    entry.price_list_item_id || '',
    (customerPos.data?.items ?? [])
      .filter(po => po.lines.some(line => line.price_list_item_id === entry.price_list_item_id))
      .map(po => po.po_number).join(', '),
  ])), [rateCardEntries, customerPos.data?.items]);
  const mappedRateCount = rateCardEntries.filter(entry => Boolean(entry.price_list_item_id && poLabels[entry.price_list_item_id])).length;

  const handleEditEntry = (entry: RateCardEntry & { _internalId?: string; _internalGaugeId?: string }) => {
    const selected = flattenedEntries.find(row => row.id === entry._internalId);
    const gaugeId = selected?.gauge_id || entry._internalGaugeId;
    if (!gaugeId) { toast.error('Gauge ID is missing. Refresh the Rate Card.'); return; }
    setEditingEntries(flattenedEntries.filter(row => row.gauge_id === gaugeId));
    requestAnimationFrame(() => document.getElementById('rate-card-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const handleSaveEntry = async (entry: RateCardEntry & { gauge_id?: string }) => {
    if (!id) {
      toast.error('Organization ID is missing');
      return;
    }

    // Get gauge_id from form (passed from form but not in interface)
    const gaugeId = entry.gauge_id;
    if (!gaugeId) {
      toast.error('Gauge ID is required');
      return;
    }

    try {
      // Get internal ID if editing
      const internalId = isEditing ? internalEntryData?.id : undefined;
      
      // Get gauge name from master data store
      const { gaugeMasterList } = useMasterDataStore.getState();
      const gauge = gaugeMasterList.find((g: { id: string; name?: string }) => g.id === gaugeId);
      const gaugeName = gauge?.name;

      // Convert to RateCardEntryWithId format
      const entryWithId: RateCardEntryWithId = {
        ...entry,
        id: internalId || `${id}_${gaugeId}_${Date.now()}`,
        price_list_item_id: isEditing ? internalEntryData?.price_list_item_id : crypto.randomUUID(),
        gauge_id: gaugeId,
        gauge_name: gaugeName,
        range_unit: entry.range_unit || entry.unit || '',
      };

      if (isEditing && internalId) {
        // Update existing entry
        await updateMutation.mutateAsync(entryWithId);
        setSelectedEntry(null);
        setInternalEntryData(null);
        setIsEditing(false);
      } else {
        // Add new entry
        await addMutation.mutateAsync(entryWithId);
        setSelectedEntry(null);
        setInternalEntryData(null);
        setIsEditing(false);
      }
    } catch (error) {
      // Error handling is done in mutation hooks
      console.error('Error saving rate card entry:', error);
    }
  };

  const handleSaveEntries = async (entries: Array<RateCardEntry & { gauge_id?: string }>) => {
    if (!id) {
      toast.error('Organization ID is missing');
      return;
    }

    if (entries.length === 0) {
      toast.error('Please add at least one rate card row');
      return;
    }

    const gaugeId = entries[0].gauge_id;
    if (!gaugeId) {
      toast.error('Gauge ID is required');
      return;
    }

    try {
      const { gaugeMasterList } = useMasterDataStore.getState();
      const gauge = gaugeMasterList.find((g: { id: string; name?: string }) => g.id === gaugeId);
      const gaugeName = gauge?.name;
      const timestamp = Date.now();

      const entriesWithIds: RateCardEntryWithId[] = entries.map((entry, index) => ({
        ...entry,
        id: `${id}_${gaugeId}_${timestamp}_${index}`,
        price_list_item_id: crypto.randomUUID(),
        gauge_id: gaugeId,
        gauge_name: gaugeName,
        range_unit: entry.range_unit || entry.unit || '',
      }));

      await addManyMutation.mutateAsync(entriesWithIds);
      setSelectedEntry(null);
      setInternalEntryData(null);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving rate card entries:', error);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!id) {
      toast.error('Organization ID is missing');
      return;
    }

    if (!entryId) {
      toast.error('Entry ID is missing');
      return;
    }

    try {
      await deleteMutation.mutateAsync(entryId);
      // Success toast is handled in the mutation hook
    } catch {
      // Error handling is done in mutation hook
      toast.error('Failed to delete rate card entry');
    }
  };


  const handleDownloadTemplate = async () => {
    setTemplateDownloading(true);
    try {
      const { blob, filename } = await downloadRateCardTemplate(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Rate card template downloaded');
    } catch (error) {
      console.error('Error downloading rate card template:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to download rate card template');
    } finally {
      setTemplateDownloading(false);
    }
  };

  const handleRateCardExcelFile = async (file?: File) => {
    if (!file) {
      return;
    }

    const isExcel = file.name.toLowerCase().endsWith('.xlsx');
    if (!isExcel) {
      toast.error('Please select a .xlsx rate card template');
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
      return;
    }

    try {
      const preview = await previewImportMutation.mutateAsync(file);
      setImportFile(file);
      setImportPreview(preview);

      if (preview.summary.error_rows > 0) {
        toast.error(`${preview.summary.error_rows} row ${preview.summary.error_rows === 1 ? 'has' : 'have'} import errors`);
      } else {
        toast.success(`${preview.summary.valid_rows} rate card ${preview.summary.valid_rows === 1 ? 'row' : 'rows'} ready to import`);
      }
    } catch (error) {
      console.error('Error previewing rate card import:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to preview rate card import');
      setImportFile(null);
      setImportPreview(null);
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!importFile || !importPreview) {
      toast.error('Please preview an Excel file before importing');
      return;
    }

    if (importPreview.summary.error_rows > 0) {
      toast.error('Fix import errors before confirming');
      return;
    }

    try {
      await confirmImportMutation.mutateAsync(importFile);
      setImportFile(null);
      setImportPreview(null);
    } catch {
      // The mutation displays the error toast.
    }
  };

  const handleClearImportPreview = () => {
    setImportFile(null);
    setImportPreview(null);
  };

  if (!id) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-600 text-sm">Organization not found.</p>
          <Button
            onClick={() => navigate('/masters/party-master')}
            className="mt-2 h-9"
            variant="outline"
          >
            Back to Organizations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-2">
      <PageMeta title="Rate Card" />
      <Card className="border border-slate-200 shadow-none">
        <Card.Header className="border-b border-gray-200 bg-blue-600 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-2">
              <ClipboardDocumentListIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Rate Card</h1>
            </div>
          </div>
        </Card.Header>

        <Card.Content className="p-2 lg:p-2">
          <div id="rate-card-editor">
          {editingEntries ? <RateCardBulkEditor
            key={editingEntries[0]?.gauge_id}
            entries={editingEntries}
            saving={bulkUpdateMutation.isPending}
            onCancel={() => setEditingEntries(null)}
            onSave={async entries => {
              await bulkUpdateMutation.mutateAsync({ original: editingEntries, entries });
              setEditingEntries(null);
            }}
          /> : (
          <RateCardForm
            entry={selectedEntry}
            onSave={handleSaveEntry}
            onSaveMany={handleSaveEntries}
            onCancel={() => {
              setSelectedEntry(null);
              setInternalEntryData(null);
              setIsEditing(false);
            }}
            saving={addMutation.isPending || addManyMutation.isPending || updateMutation.isPending}
          />
          )}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(event) => {
                void handleRateCardExcelFile(event.target.files?.[0]);
              }}
            />

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Bulk Import</h2>
                <p className="text-xs text-slate-500">
                  Upload the generated Excel template. Import replaces rates only for gauges present in the file.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 gap-2 px-3 text-sm"
                  onClick={() => {
                    void handleDownloadTemplate();
                  }}
                  disabled={templateDownloading}
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  {templateDownloading ? 'Downloading...' : 'Download Excel Template'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 gap-2 px-3 text-sm"
                  onClick={() => importInputRef.current?.click()}
                  disabled={previewImportMutation.isPending}
                >
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  {previewImportMutation.isPending ? 'Checking...' : 'Import Rate Card Excel'}
                </Button>
              </div>
            </div>

            {importPreview && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {importPreview.summary.error_rows > 0 ? (
                        <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-red-500" />
                      ) : (
                        <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-600" />
                      )}
                      <h3 className="truncate text-sm font-semibold text-slate-900">
                        {importFile?.name || 'Excel import preview'}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {importPreview.summary.valid_rows} valid, {importPreview.summary.error_rows} errors,{' '}
                      {importPreview.summary.warning_rows} warnings, {importPreview.summary.affected_gauges} gauges affected.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 gap-2 px-3 text-sm"
                      onClick={handleClearImportPreview}
                      disabled={confirmImportMutation.isPending}
                    >
                      <XMarkIcon className="h-4 w-4" />
                      Clear
                    </Button>
                    <Button
                      type="button"
                      className="h-8 bg-blue-600 px-3 text-sm hover:bg-blue-700"
                      onClick={() => {
                        void handleConfirmImport();
                      }}
                      disabled={
                        confirmImportMutation.isPending ||
                        importPreview.summary.error_rows > 0 ||
                        importPreview.summary.valid_rows === 0
                      }
                    >
                      {confirmImportMutation.isPending ? 'Importing...' : 'Confirm Import'}
                    </Button>
                  </div>
                </div>

                {(importPreview.summary.error_rows > 0 || importPreview.summary.warning_rows > 0) && (
                  <div className="mt-3 max-h-48 overflow-auto rounded-lg border border-slate-200">
                    <table className="w-full min-w-[720px] text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Row</th>
                          <th className="px-3 py-2 font-semibold">Gauge</th>
                          <th className="px-3 py-2 font-semibold">Status</th>
                          <th className="px-3 py-2 font-semibold">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.rows
                          .filter((row) => row.errors.length > 0 || row.warnings.length > 0)
                          .slice(0, 20)
                          .map((row) => (
                            <tr key={`${row.row_number}-${row.gauge_id}`} className="border-t border-slate-100">
                              <td className="px-3 py-2 text-slate-700">{row.row_number}</td>
                              <td className="px-3 py-2 text-slate-700">{row.gauge_name || '-'}</td>
                              <td className="px-3 py-2">
                                <span className={row.status === 'error' ? 'text-red-600' : 'text-amber-600'}>
                                  {row.status === 'error' ? 'Error' : 'Warning'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {[...row.errors, ...row.warnings].join(' ')}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between border-t border-slate-200 px-1 pt-4">
              <h2 className="text-base font-semibold text-slate-900">
                Rate Card Entries
              </h2>
              <span className="text-sm text-slate-500">
                {rateCardEntries.length} {rateCardEntries.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
            {id && <PoAssignmentPanel customerId={id} selectedIds={[...selectedRateIds]} onAssigned={() => setSelectedRateIds(new Set())} />}
            {customerPos.data && <p className="text-sm text-slate-600">{customerPos.data.items.length} saved POs · {mappedRateCount} of {rateCardEntries.length} Rate Card entries assigned</p>}
            <RateCardTable
              selectedKeys={selectedRateIds}
              onSelectionChange={setSelectedRateIds}
              poLabels={poLabels}
              entries={rateCardEntries}
              onEdit={handleEditEntry}
              onDelete={handleDeleteEntry}
              loading={isLoading}
            />
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

export default RateCardPage;
