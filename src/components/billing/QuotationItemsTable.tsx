import React, { useState } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Input,
  Select,
  SelectItem,
} from '@heroui-v2/react';
import { useQuotationStore, QuotationItem } from '../../store/quotationStore';
import {
  DocumentDuplicateIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import {
  calculateQuotationFinalPrice,
  DEFAULT_QUOTATION_CGST_RATE,
  DEFAULT_QUOTATION_IGST_RATE,
  DEFAULT_QUOTATION_SGST_RATE,
  normalizeQuotationQuantity,
  resolveQuotationRangeSize,
  type QuotationGstType,
} from '../../utils/quotationDocumentUtils';

const GST_RATE_OPTIONS = [0, 5, 9, 12, 18, 28];

const COMPACT_INPUT_CLASS_NAMES = {
  inputWrapper:
    'min-h-[38px] rounded-md border border-slate-200 bg-white shadow-none hover:border-slate-300 focus-within:border-blue-400',
  input: 'text-sm',
};

const COMPACT_SELECT_CLASS_NAMES = {
  trigger:
    'min-h-[38px] rounded-md border border-slate-200 bg-white shadow-none hover:border-slate-300 data-[open=true]:border-blue-400',
  value: 'text-sm text-slate-700',
};

const SUMMARY_FIELD_LABEL_CLASS =
  'mb-1 block text-sm font-semibold text-slate-900';

const getRateOptions = (rate?: number) => {
  if (typeof rate !== 'number' || !Number.isFinite(rate)) {
    return GST_RATE_OPTIONS;
  }

  return Array.from(new Set([...GST_RATE_OPTIONS, rate])).sort(
    (first, second) => first - second,
  );
};

export const QuotationItemsTable: React.FC = () => {
  const {
    currentQuotation,
    duplicateQuotationItem,
    setCurrentQuotation,
    updateQuotationItem,
    removeQuotationItem,
  } = useQuotationStore();

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<QuotationItem>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const items = currentQuotation?.items || [];
  const termsConditions = currentQuotation?.terms_conditions || [];
  const gstType = currentQuotation?.gst_type || 'none';
  const cgstRate = currentQuotation?.cgst_rate ?? DEFAULT_QUOTATION_CGST_RATE;
  const sgstRate = currentQuotation?.sgst_rate ?? DEFAULT_QUOTATION_SGST_RATE;
  const igstRate = currentQuotation?.igst_rate ?? DEFAULT_QUOTATION_IGST_RATE;

  const handleEdit = (item: QuotationItem) => {
    setEditingItemId(item.id);
    setEditForm({
      hsn_sac: item.hsn_sac,
      serial_number: item.serial_number,
      make: item.make,
      quantity: item.quantity,
      range_size: item.range_size,
      unit: item.unit,
      base_price: item.base_price,
      discount_type: item.discount_type,
      discount_value: item.discount_value,
    });
  };

  const handleSaveEdit = (itemId: string) => {
    if (editForm.base_price !== undefined && editForm.base_price < 0) {
      toast.error('Base price cannot be negative');
      return;
    }

    if (
      editForm.discount_type &&
      editForm.discount_value !== undefined &&
      editForm.discount_value < 0
    ) {
      toast.error('Discount value cannot be negative');
      return;
    }

    updateQuotationItem(itemId, {
      hsn_sac: editForm.hsn_sac,
      serial_number: editForm.serial_number,
      make: editForm.make,
      quantity: editForm.quantity,
      range_size: editForm.range_size,
      unit: editForm.unit,
      base_price: editForm.base_price,
      discount_type: editForm.discount_type || null,
      discount_value: editForm.discount_value || 0,
    });

    setEditingItemId(null);
    setEditForm({});
    toast.success('Item updated');
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditForm({});
  };

  const requestRemove = (itemId: string) => {
    setPendingDeleteId(itemId);
    setDeleteOpen(true);
  };

  const handleDuplicate = (item: QuotationItem) => {
    const duplicatedItemId = duplicateQuotationItem(item.id);
    if (!duplicatedItemId) {
      toast.error('Failed to duplicate quotation row');
      return;
    }

    setEditingItemId(duplicatedItemId);
    setEditForm({
      hsn_sac: item.hsn_sac,
      serial_number: item.serial_number,
      make: item.make,
      quantity: item.quantity,
      range_size: item.range_size,
      unit: item.unit,
      base_price: item.base_price,
      discount_type: item.discount_type,
      discount_value: item.discount_value,
    });
    toast.success('Row duplicated. Update the range and price as needed.');
  };

  const closeDelete = () => {
    setDeleteOpen(false);
    setPendingDeleteId(null);
  };

  const confirmRemove = async () => {
    if (!pendingDeleteId) return;
    removeQuotationItem(pendingDeleteId);
    toast.success('Item removed');
  };

  const formatDiscount = (item: QuotationItem): string => {
    if (!item.discount_type || item.discount_value === 0) {
      return '-';
    }
    if (item.discount_type === 'percentage') {
      return `${item.discount_value}%`;
    } else {
      return `₹${item.discount_value.toFixed(2)}`;
    }
  };

  const updateTermsConditions = (nextTerms: string[]) => {
    setCurrentQuotation({
      terms_conditions: nextTerms,
    });
  };

  const handleTermChange = (index: number, value: string) => {
    const nextTerms = [...termsConditions];
    nextTerms[index] = value;
    updateTermsConditions(nextTerms);
  };

  const handleAddTerm = () => {
    updateTermsConditions([...termsConditions, '']);
  };

  const handleRemoveTerm = (index: number) => {
    const nextTerms = termsConditions.filter(
      (_, termIndex) => termIndex !== index,
    );
    updateTermsConditions(nextTerms);
  };

  const getLiveFinalPrice = (item: QuotationItem) => {
    if (editingItemId !== item.id) {
      return item.final_price;
    }

    const basePrice =
      typeof editForm.base_price === 'number' &&
      Number.isFinite(editForm.base_price)
        ? editForm.base_price
        : item.base_price;
    const quantity =
      typeof editForm.quantity === 'number' &&
      Number.isFinite(editForm.quantity)
        ? normalizeQuotationQuantity(editForm.quantity)
        : normalizeQuotationQuantity(item.quantity);
    const discountType =
      editForm.discount_type !== undefined
        ? editForm.discount_type
        : item.discount_type;
    const discountValue =
      typeof editForm.discount_value === 'number' &&
      Number.isFinite(editForm.discount_value)
        ? editForm.discount_value
        : item.discount_value;

    return calculateQuotationFinalPrice(
      basePrice,
      quantity,
      discountType,
      discountValue,
    );
  };

  const getSpecificationText = (item: QuotationItem) =>
    resolveQuotationRangeSize({
      rangeSize: item.range_size,
      specifications: item.specifications,
      unit: item.unit,
    });

  const updateGstType = (value: QuotationGstType) => {
    setCurrentQuotation({
      gst_type: value,
      cgst_rate:
        value === 'cgst_sgst' ? cgstRate || DEFAULT_QUOTATION_CGST_RATE : 0,
      sgst_rate:
        value === 'cgst_sgst' ? sgstRate || DEFAULT_QUOTATION_SGST_RATE : 0,
      igst_rate: value === 'igst' ? igstRate || DEFAULT_QUOTATION_IGST_RATE : 0,
    });
  };

  const updateGstRate = (
    field: 'cgst_rate' | 'sgst_rate' | 'igst_rate',
    value: string,
  ) => {
    const parsedRate = parseFloat(value);
    setCurrentQuotation({
      [field]: Number.isFinite(parsedRate) ? parsedRate : 0,
    });
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No items added yet. Add items using the form above.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <Table
        aria-label="Quotation items table"
        classNames={{
          wrapper: 'max-h-[600px] overflow-auto p-0',
          th: 'bg-slate-100 text-slate-700 font-semibold text-xs uppercase tracking-wider border-b border-slate-200',
          td: 'border-b border-slate-100 py-2',
          tr: 'hover:bg-blue-50/40 transition-colors',
        }}
      >
        <TableHeader>
          <TableColumn>GAUGE NAME</TableColumn>
          <TableColumn>SERIAL NO</TableColumn>
          <TableColumn>MAKE</TableColumn>
          <TableColumn>HSN / SAC</TableColumn>
          <TableColumn>QTY</TableColumn>
          <TableColumn>SPECIFICATIONS</TableColumn>
          <TableColumn>BASE PRICE</TableColumn>
          <TableColumn>DISCOUNT</TableColumn>
          <TableColumn>FINAL PRICE</TableColumn>
          <TableColumn>ACTIONS</TableColumn>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isEditing = editingItemId === item.id;
            const liveFinalPrice = getLiveFinalPrice(item);

            return (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="min-w-48 whitespace-normal text-sm font-medium text-slate-900">
                    {item.gauge_name}
                  </div>
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      value={editForm.serial_number || ''}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          serial_number: e.target.value,
                        })
                      }
                      size="sm"
                      className="w-32"
                      classNames={COMPACT_INPUT_CLASS_NAMES}
                    />
                  ) : (
                    item.serial_number || '-'
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      value={editForm.make || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, make: e.target.value })
                      }
                      size="sm"
                      className="w-32"
                      classNames={COMPACT_INPUT_CLASS_NAMES}
                    />
                  ) : (
                    item.make || '-'
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      value={editForm.hsn_sac || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, hsn_sac: e.target.value })
                      }
                      size="sm"
                      className="w-28"
                      classNames={COMPACT_INPUT_CLASS_NAMES}
                    />
                  ) : (
                    item.hsn_sac || '-'
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={String(editForm.quantity || '')}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          quantity: Math.max(
                            1,
                            parseFloat(e.target.value) || 1,
                          ),
                        })
                      }
                      size="sm"
                      className="w-20"
                      min="1"
                      step="1"
                      classNames={COMPACT_INPUT_CLASS_NAMES}
                    />
                  ) : (
                    normalizeQuotationQuantity(item.quantity)
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <div className="flex min-w-48 gap-2">
                      <Input
                        value={editForm.range_size || ''}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            range_size: e.target.value,
                          })
                        }
                        size="sm"
                        className="w-32"
                        classNames={COMPACT_INPUT_CLASS_NAMES}
                      />
                      <Input
                        value={editForm.unit || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, unit: e.target.value })
                        }
                        size="sm"
                        className="w-20"
                        classNames={COMPACT_INPUT_CLASS_NAMES}
                      />
                    </div>
                  ) : (
                    <span className="whitespace-normal">
                      {getSpecificationText(item)}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={String(editForm.base_price || '')}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          base_price: parseFloat(e.target.value) || 0,
                        })
                      }
                      size="sm"
                      className="w-24"
                      startContent={<span className="text-xs">₹</span>}
                      min="0"
                      step="0.01"
                      classNames={COMPACT_INPUT_CLASS_NAMES}
                    />
                  ) : (
                    `₹${item.base_price.toFixed(2)}`
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Select
                        selectedKeys={
                          editForm.discount_type
                            ? [editForm.discount_type]
                            : ['none']
                        }
                        onSelectionChange={(keys) => {
                          const value = Array.from(keys)[0] as string;
                          setEditForm({
                            ...editForm,
                            discount_type:
                              value === 'none'
                                ? null
                                : (value as 'percentage' | 'flat'),
                            discount_value:
                              value === 'none' ? 0 : editForm.discount_value,
                          });
                        }}
                        size="sm"
                        className="w-24"
                        classNames={COMPACT_SELECT_CLASS_NAMES}
                      >
                        <SelectItem key="none" value="none">
                          None
                        </SelectItem>
                        <SelectItem key="percentage" value="percentage">
                          %
                        </SelectItem>
                        <SelectItem key="flat" value="flat">
                          Flat
                        </SelectItem>
                      </Select>
                      {editForm.discount_type && (
                        <Input
                          type="number"
                          value={String(editForm.discount_value || '')}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              discount_value: parseFloat(e.target.value) || 0,
                            })
                          }
                          size="sm"
                          className="w-20"
                          min="0"
                          step="0.01"
                          max={
                            editForm.discount_type === 'percentage'
                              ? '100'
                              : undefined
                          }
                          classNames={COMPACT_INPUT_CLASS_NAMES}
                        />
                      )}
                    </div>
                  ) : (
                    formatDiscount(item)
                  )}
                </TableCell>
                <TableCell>
                  <span className="font-semibold text-blue-700">
                    ₹{liveFinalPrice.toFixed(2)}
                  </span>
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        color="primary"
                        onClick={() => handleSaveEdit(item.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="light"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        onPress={() => handleDuplicate(item)}
                        className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-100 h-7"
                      >
                        <DocumentDuplicateIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onPress={() => handleEdit(item)}
                        className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-100 h-7"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onPress={() => requestRemove(item.id)}
                        className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-100 h-7"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Summary */}
      {currentQuotation && (
        <div className="mt-2">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className={SUMMARY_FIELD_LABEL_CLASS}>GST</label>
                  <Select
                    selectedKeys={[gstType]}
                    aria-label="Quotation GST"
                    onSelectionChange={(keys) => {
                      const value = Array.from(keys)[0] as QuotationGstType;
                      updateGstType(value);
                    }}
                    classNames={COMPACT_SELECT_CLASS_NAMES}
                  >
                    <SelectItem key="none">No GST</SelectItem>
                    <SelectItem key="cgst_sgst">CGST + SGST</SelectItem>
                    <SelectItem key="igst">IGST</SelectItem>
                  </Select>
                </div>

                {gstType === 'cgst_sgst' ? (
                  <>
                    <div>
                      <label className={SUMMARY_FIELD_LABEL_CLASS}>
                        CGST (%)
                      </label>
                      <Select
                        selectedKeys={[String(cgstRate)]}
                        aria-label="Quotation CGST"
                        onSelectionChange={(keys) => {
                          const value = Array.from(keys)[0] as string;
                          updateGstRate('cgst_rate', value);
                        }}
                        classNames={COMPACT_SELECT_CLASS_NAMES}
                      >
                        {getRateOptions(cgstRate).map((rate) => (
                          <SelectItem
                            key={rate.toString()}
                            textValue={rate.toString()}
                          >
                            {rate}%
                          </SelectItem>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label className={SUMMARY_FIELD_LABEL_CLASS}>
                        SGST (%)
                      </label>
                      <Select
                        selectedKeys={[String(sgstRate)]}
                        aria-label="Quotation SGST"
                        onSelectionChange={(keys) => {
                          const value = Array.from(keys)[0] as string;
                          updateGstRate('sgst_rate', value);
                        }}
                        classNames={COMPACT_SELECT_CLASS_NAMES}
                      >
                        {getRateOptions(sgstRate).map((rate) => (
                          <SelectItem
                            key={rate.toString()}
                            textValue={rate.toString()}
                          >
                            {rate}%
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                  </>
                ) : null}

                {gstType === 'igst' ? (
                  <div>
                    <label className={SUMMARY_FIELD_LABEL_CLASS}>
                      IGST (%)
                    </label>
                    <Select
                      selectedKeys={[String(igstRate)]}
                      aria-label="Quotation IGST"
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] as string;
                        updateGstRate('igst_rate', value);
                      }}
                      classNames={COMPACT_SELECT_CLASS_NAMES}
                    >
                      {getRateOptions(igstRate).map((rate) => (
                        <SelectItem
                          key={rate.toString()}
                          textValue={rate.toString()}
                        >
                          {rate}%
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Terms & Conditions
                    </p>
                    <p className="text-sm text-slate-500">
                      Add each point separately. These bullets will appear in
                      the quotation PDF.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    onPress={handleAddTerm}
                    startContent={<PlusIcon className="h-4 w-4" />}
                    className="bg-blue-50 text-blue-700"
                  >
                    Add Term
                  </Button>
                </div>

                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                        <th className="w-14 border-b border-slate-200 px-4 py-3 text-center">
                          Sr.
                        </th>
                        <th className="border-b border-slate-200 px-4 py-3"></th>
                        <th className="w-24 border-b border-slate-200 px-4 py-3 text-center">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {termsConditions.length > 0 ? (
                        termsConditions.map((term, index) => (
                          <tr key={`${index}-${term}`} className="align-top">
                            <td className="border-b border-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-500">
                              {index + 1}
                            </td>
                            <td className="border-b border-slate-100 px-4 py-3">
                              <div className="flex items-start gap-3">
                                <Input
                                  value={term}
                                  onChange={(e) =>
                                    handleTermChange(index, e.target.value)
                                  }
                                  placeholder="Enter term and condition"
                                  size="sm"
                                  variant="bordered"
                                  classNames={COMPACT_INPUT_CLASS_NAMES}
                                />
                              </div>
                            </td>
                            <td className="border-b border-slate-100 px-4 py-3 text-center">
                              <Button
                                size="sm"
                                variant="light"
                                onClick={() => handleRemoveTerm(index)}
                                className="text-red-600"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-5 text-center text-sm text-slate-500"
                          >
                            No terms added yet. Use Add Term to create bullet
                            points.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="w-full max-w-xs space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">
                  ₹{currentQuotation.subtotal?.toFixed(2) || '0.00'}
                </span>
              </div>
              {currentQuotation.total_discount &&
                currentQuotation.total_discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Discount:</span>
                    <span className="font-medium text-red-600">
                      -₹{currentQuotation.total_discount.toFixed(2)}
                    </span>
                  </div>
                )}
              {currentQuotation.total_discount ||
              currentQuotation.cgst_amount ||
              currentQuotation.sgst_amount ||
              currentQuotation.igst_amount ? (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Taxable Amount:</span>
                  <span className="font-medium">
                    ₹{currentQuotation.taxable_amount?.toFixed(2) || '0.00'}
                  </span>
                </div>
              ) : null}
              {currentQuotation.cgst_amount &&
              currentQuotation.cgst_amount > 0 ? (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    CGST ({currentQuotation.cgst_rate?.toFixed(2) || '0.00'}%):
                  </span>
                  <span className="font-medium">
                    ₹{currentQuotation.cgst_amount.toFixed(2)}
                  </span>
                </div>
              ) : null}
              {currentQuotation.sgst_amount &&
              currentQuotation.sgst_amount > 0 ? (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    SGST ({currentQuotation.sgst_rate?.toFixed(2) || '0.00'}%):
                  </span>
                  <span className="font-medium">
                    ₹{currentQuotation.sgst_amount.toFixed(2)}
                  </span>
                </div>
              ) : null}
              {currentQuotation.igst_amount &&
              currentQuotation.igst_amount > 0 ? (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    IGST ({currentQuotation.igst_rate?.toFixed(2) || '0.00'}%):
                  </span>
                  <span className="font-medium">
                    ₹{currentQuotation.igst_amount.toFixed(2)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                <span>Grand Total:</span>
                <span className="text-blue-700">
                  ₹{currentQuotation.grand_total?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={closeDelete}
        title="Remove quotation item"
        message={
          <>
            Are you sure you want to remove this item? This action cannot be
            undone.
          </>
        }
        onConfirm={confirmRemove}
      />
    </div>
  );
};
