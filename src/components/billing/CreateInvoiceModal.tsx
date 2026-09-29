import React, { useState } from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input, Label, ListBox, Select } from '@heroui/react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { OutwardGaugeItem } from '../../store/outwardStore';
import { useInvoiceStore } from '../../store/invoiceStore';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { transformInvoiceItemsToInvoiceData, type InvoiceItemData } from './invoiceUtils';
import { getCurrentIsoDate } from '../../utils/dateAdapter';

// HSN Codes with names
const HSN_CODES = [
  { code: '998346', name: 'Calibration' },
  { code: '998729', name: 'Repair' },
  { code: '90173010', name: 'New Gauges' },
  // { code: '998349', name: 'Verification Services' },
];

const DEFAULT_HSN = '998346'; // Calibration HSN

interface InvoiceItemHSN {
  id: string; // Unique ID for this HSN entry
  hsnCode: string;
  hsnName: string;
  rate: string;
  quantity: number;
}

interface InvoiceItemDataLocal {
  gaugeItem: OutwardGaugeItem;
  hsnEntries: InvoiceItemHSN[];
}

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: OutwardGaugeItem[];
  outwardEntry: any;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  selectedItems,
  outwardEntry,
}) => {
  const { createInvoice, creatingInvoice } = useInvoiceStore();
  const [invoiceItemsData, setInvoiceItemsData] = useState<InvoiceItemDataLocal[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewInvoiceData, setPreviewInvoiceData] = useState<any>(null);

  // Initialize invoice items data when modal opens
  React.useEffect(() => {
    if (isOpen && selectedItems.length > 0) {
      const initialData: InvoiceItemData[] = selectedItems.map((item) => ({
        gaugeItem: item,
        hsnEntries: [
          {
            id: `${item.id || Date.now()}-${Math.random()}`,
            hsnCode: DEFAULT_HSN,
            hsnName: HSN_CODES.find(h => h.code === DEFAULT_HSN)?.name || 'Calibration Services',
            rate: '',
            quantity: 1,
          },
        ],
      }));
      setInvoiceItemsData(initialData);
    }
  }, [isOpen, selectedItems]);

  // Add HSN entry for a gauge
  const handleAddHSN = (gaugeIndex: number) => {
    setInvoiceItemsData((prev) => {
      const updated = [...prev];
      const newHSN: InvoiceItemHSN = {
        id: `${Date.now()}-${Math.random()}`,
        hsnCode: DEFAULT_HSN,
        hsnName: HSN_CODES.find(h => h.code === DEFAULT_HSN)?.name || 'Calibration Services',
        rate: '',
        quantity: 1,
      };
      updated[gaugeIndex].hsnEntries.push(newHSN);
      return updated;
    });
  };

  // Remove HSN entry
  const handleRemoveHSN = (gaugeIndex: number, hsnId: string) => {
    setInvoiceItemsData((prev) => {
      const updated = [...prev];
      if (updated[gaugeIndex].hsnEntries.length > 1) {
        updated[gaugeIndex].hsnEntries = updated[gaugeIndex].hsnEntries.filter(
          (entry) => entry.id !== hsnId
        );
      } else {
        toast.error('At least one HSN entry is required per gauge');
      }
      return updated;
    });
  };

  // Update HSN code
  const handleHSNChange = (gaugeIndex: number, hsnId: string, hsnCode: string) => {
    setInvoiceItemsData((prev) => {
      const updated = [...prev];
      const entry = updated[gaugeIndex].hsnEntries.find((e) => e.id === hsnId);
      if (entry) {
        entry.hsnCode = hsnCode;
        entry.hsnName = HSN_CODES.find((h) => h.code === hsnCode)?.name || '';
      }
      return updated;
    });
  };

  // Update rate
  const handleRateChange = (gaugeIndex: number, hsnId: string, rate: string) => {
    setInvoiceItemsData((prev) => {
      const updated = [...prev];
      const entry = updated[gaugeIndex].hsnEntries.find((e) => e.id === hsnId);
      if (entry) {
        entry.rate = rate;
      }
      return updated;
    });
  };

  // Update quantity
  const handleQuantityChange = (gaugeIndex: number, hsnId: string, quantity: number) => {
    setInvoiceItemsData((prev) => {
      const updated = [...prev];
      const entry = updated[gaugeIndex].hsnEntries.find((e) => e.id === hsnId);
      if (entry) {
        entry.quantity = quantity;
      }
      return updated;
    });
  };

  // Validate form data
  const validateData = (): boolean => {
    for (const itemData of invoiceItemsData) {
      for (const hsnEntry of itemData.hsnEntries) {
        if (!hsnEntry.hsnCode) {
          toast.error(`Please select HSN code for ${itemData.gaugeItem.master_gauge_name}`);
          return false;
        }
        if (!hsnEntry.rate || parseFloat(hsnEntry.rate) <= 0) {
          toast.error(`Please enter valid rate for ${itemData.gaugeItem.master_gauge_name} - ${hsnEntry.hsnName}`);
          return false;
        }
        if (hsnEntry.quantity <= 0) {
          toast.error(`Please enter valid quantity for ${itemData.gaugeItem.master_gauge_name} - ${hsnEntry.hsnName}`);
          return false;
        }
      }
    }
    return true;
  };

  // Handle create invoice
  const handleCreateInvoice = async () => {
    if (!validateData()) {
      return;
    }

    try {
      // Transform data for API
      const invoiceItems = invoiceItemsData.flatMap((itemData) =>
        itemData.hsnEntries.map((hsnEntry) => ({
          outward_gauge_item_id: itemData.gaugeItem.id || itemData.gaugeItem.inward_gauge_lab_id || '',
          hsn_code: hsnEntry.hsnCode,
          rate: parseFloat(hsnEntry.rate),
          quantity: hsnEntry.quantity,
          gauge_name: itemData.gaugeItem.master_gauge_name,
          identification_number: itemData.gaugeItem.identification_number,
          dc_no: (itemData.gaugeItem as any).client_dc_no || (itemData.gaugeItem as any).dc_no || '-',
          specification: (itemData.gaugeItem as any).specification || '-',
        }))
      );

      // Prepare API payload
      const invoicePayload = {
        outward_id: String(outwardEntry?.id || outwardEntry?.outward_no || ''),
        company_id: String(outwardEntry?.client_org_id || ''),
        billing_date: getCurrentIsoDate(),
        items: invoiceItems,
      };

      // Call API to save invoice
      const savedInvoice = await createInvoice(invoicePayload);

      // Transform to invoice data for PDF - convert local format to expected format
      const transformedItemsData: InvoiceItemData[] = invoiceItemsData.map((itemData) => ({
        gaugeItem: itemData.gaugeItem,
        hsnEntries: itemData.hsnEntries.map((entry) => ({
          id: entry.id,
          hsnCode: entry.hsnCode,
          hsnName: entry.hsnName,
          rate: entry.rate,
          quantity: entry.quantity,
        })),
      }));

      const invoiceData = transformInvoiceItemsToInvoiceData(
        transformedItemsData,
        savedInvoice
      );

      // Show preview modal
      setPreviewInvoiceData(invoiceData);
      setIsPreviewModalOpen(true);
      onClose(); // Close create modal

      toast.success('Invoice created successfully!');
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice. Please try again.');
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Create Invoice"
        className="max-w-6xl max-h-[90vh]"
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {invoiceItemsData.map((itemData, gaugeIndex) => (
              <div
                key={gaugeIndex}
                className="border border-gray-200 rounded-lg p-4 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-lg">
                      {itemData.gaugeItem.master_gauge_name || 'Unknown Gauge'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      ID: {itemData.gaugeItem.identification_number || '-'} | 
                      Lab ID: {itemData.gaugeItem.inward_gauge_lab_id || '-'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {itemData.hsnEntries.map((hsnEntry) => (
                    <div
                      key={hsnEntry.id}
                      className="grid grid-cols-12 gap-3 items-end bg-gray-50 p-3 rounded"
                    >
                      <div className="col-span-4">
                        <Select selectedKey={hsnEntry.hsnCode} onSelectionChange={(key) => handleHSNChange(gaugeIndex, hsnEntry.id, String(key ?? DEFAULT_HSN))}>
                          <Label>HSN Code</Label><Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                          <Select.Popover><ListBox>{HSN_CODES.map((hsn) => <ListBox.Item key={hsn.code} id={hsn.code} textValue={`${hsn.code} - ${hsn.name}`}>{hsn.code} - {hsn.name}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
                        </Select>
                      </div>

                      <div className="col-span-3">
                        <Input
                          aria-label="Rate in rupees"
                          type="number"
                          value={hsnEntry.rate}
                          onChange={(e) => handleRateChange(gaugeIndex, hsnEntry.id, e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div className="col-span-2">
                        <Input
                          aria-label="Quantity"
                          type="number"
                          value={hsnEntry.quantity.toString()}
                          onChange={(e) =>
                            handleQuantityChange(
                              gaugeIndex,
                              hsnEntry.id,
                              parseInt(e.target.value) || 1
                            )
                          }
                          min="1"
                        />
                      </div>

                      <div className="col-span-2">
                        <div className="text-sm">
                          <div className="text-gray-500">Amount</div>
                          <div className="font-semibold">
                            ₹{((parseFloat(hsnEntry.rate) || 0) * hsnEntry.quantity).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="col-span-1 flex justify-end">
                        {itemData.hsnEntries.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveHSN(gaugeIndex, hsnEntry.id)}
                            className="size-7 p-0"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAddHSN(gaugeIndex)}
                    leftIcon={<PlusIcon className="w-4 h-4" />}
                    className="w-full"
                  >
                    Add Another HSN
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Total Items: {invoiceItemsData.length} | 
              Total HSN Entries: {invoiceItemsData.reduce((sum, item) => sum + item.hsnEntries.length, 0)}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateInvoice}
                disabled={creatingInvoice || invoiceItemsData.length === 0}
                loading={creatingInvoice}
                className="bg-blue-600 text-white"
              >
                Create Invoice
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Invoice Preview Modal */}
      <InvoicePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        invoiceData={previewInvoiceData}
        loading={false}
      />
    </>
  );
};
