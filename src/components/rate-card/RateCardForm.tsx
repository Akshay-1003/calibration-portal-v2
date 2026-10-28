import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui/button';
import { ComboBox, Input, ListBox, Select, useFilter } from '@heroui/react';
import {
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useGaugeMastersQuery } from '../../hooks/queries/masterData';
import { useThreadRingPlugsQuery } from '../../hooks/queries/threadRingPlugs';
import { useTaperThreadReadingsQuery } from '../../hooks/queries/taperThreadReadings';
import { FormField } from '../ui/form-field';
import { rateCardFormSchema, type RateCardFormData } from '../../lib/validations/schemas';
import type { RateCardEntry } from '../../pages/masters/PartyMaster/rate-card';
import { normalizeRateCardDiscount } from '../../utils/rateCardDiscount';

type RangeType = 'range' | 'specification' | 'basic_size';

interface RateCardFormProps {
  entry?: RateCardEntry | null;
  onSave: (entry: RateCardEntry) => void | Promise<void>;
  onSaveMany?: (entries: RateCardEntry[]) => void | Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

interface SpecificationOption {
  value: string;
  label: string;
  type: 'plain-thread' | 'taper-thread';
}

type SpecificationRecord = {
  standard_specification?: string | null;
  id?: string | null;
};

type EditableRateCardEntry = RateCardEntry & {
  gauge_id?: string;
  _internalGaugeId?: string;
};

type RateCardRowInput = {
  range: { min: string | number; max: string | number };
  standard_specification: string;
  basic_size: string | number | undefined;
  least_count: string | number | undefined;
  rate: string | number;
};

const INPUT_CLASS_NAMES = {
  input: 'min-h-[42px] rounded-md border border-gray-300 bg-white px-3 hover:border-gray-400 focus:border-blue-500',
};

const COMPACT_INPUT_CLASS_NAMES = {
  input: 'h-9 rounded-md border border-gray-300 bg-white px-3 text-sm hover:border-gray-400 focus:border-blue-500',
};

const SELECT_CLASS_NAMES = {
  trigger: 'min-h-[42px] w-full rounded-md border border-gray-300 bg-white px-3 hover:border-primary',
};

const INVALID_INPUT_WRAPPER =
  'min-h-[42px] border border-destructive bg-white hover:border-destructive focus-within:border-destructive';

const INVALID_COMPACT_INPUT_WRAPPER =
  'min-h-9 h-9 border border-destructive bg-white hover:border-destructive focus-within:border-destructive';

const DEFAULT_RATE_ROW: RateCardRowInput = {
  range: { min: '', max: '' },
  standard_specification: '',
  basic_size: undefined,
  least_count: undefined,
  rate: '',
};

const toSpecificationRecord = (value: unknown): SpecificationRecord => {
  if (typeof value === 'object' && value !== null) {
    return value as SpecificationRecord;
  }

  return {};
};

const toSpecificationOption = (
  item: unknown,
  type: SpecificationOption['type']
): SpecificationOption => {
  const record = toSpecificationRecord(item);
  const value = record.standard_specification || record.id || '';

  return {
    value,
    label: value || 'N/A',
    type,
  };
};

const createEmptyRateRow = (): RateCardRowInput => ({
  range: { ...DEFAULT_RATE_ROW.range },
  standard_specification: '',
  basic_size: undefined,
  least_count: undefined,
  rate: '',
});

const getDetectedRangeType = (entry: RateCardEntry | null | undefined): RangeType => {
  if (entry?.range && (entry.range.min !== 0 || entry.range.max !== 0)) return 'range';
  if (entry?.standard_specification) {
    return 'specification';
  }

  if (entry?.basic_size !== undefined && entry.basic_size !== null) {
    return 'basic_size';
  }

  return 'range';
};

const isPlungerDialGauge = (gaugeName?: string) =>
  (gaugeName || '').toLowerCase().includes('plunger dial');

export const RateCardForm = ({
  entry,
  onSave,
  onSaveMany,
  onCancel,
  saving = false,
}: RateCardFormProps) => {
  const gaugeMastersQuery = useGaugeMastersQuery();
  const threadRingPlugsQuery = useThreadRingPlugsQuery();
  const taperThreadReadingsQuery = useTaperThreadReadingsQuery();
  const { contains } = useFilter({ sensitivity: 'base' });

  const gaugeMasterList = useMemo(() => gaugeMastersQuery.data ?? [], [gaugeMastersQuery.data]);

  const specifications = useMemo<SpecificationOption[]>(() => {
    const plainThreadSpecs = (threadRingPlugsQuery.data ?? []).map((item) =>
      toSpecificationOption(item, 'plain-thread')
    );

    const taperThreadSpecs = (taperThreadReadingsQuery.data ?? []).map((item) =>
      toSpecificationOption(item, 'taper-thread')
    );

    return [...plainThreadSpecs, ...taperThreadSpecs];
  }, [threadRingPlugsQuery.data, taperThreadReadingsQuery.data]);

  const form = useForm<z.input<typeof rateCardFormSchema>, unknown, z.output<typeof rateCardFormSchema>>({
    resolver: zodResolver(rateCardFormSchema),
    mode: 'onChange',
    defaultValues: {
      gauge_id: '',
      rate_type: 'discount',
      range_type: 'range',
      description: '',
      discount: '',
      unit: 'rs/unit',
      entries: [createEmptyRateRow()],
    },
  });

  const {
    control,
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'entries',
  });

  const rateType = watch('rate_type');
  const rangeType = watch('range_type');
  const selectedGaugeId = watch('gauge_id');
  const selectedGaugeName = useMemo(
    () => gaugeMasterList.find((gauge: { id: string; name: string }) => gauge.id === selectedGaugeId)?.name ?? '',
    [gaugeMasterList, selectedGaugeId]
  );
  const showLeastCount = isPlungerDialGauge(selectedGaugeName);
  const rowErrors = errors.entries ?? [];

  useEffect(() => {
    if (entry) {
      const editableEntry = entry as EditableRateCardEntry;
      const detectedRangeType = getDetectedRangeType(entry);

      reset({
        gauge_id: editableEntry.gauge_id || editableEntry._internalGaugeId || '',
        rate_type:
          entry.rate_type === 'discount' || entry.rate_type === 'discounted'
            ? 'discount'
            : entry.rate_type === 'flat'
              ? 'flat'
            : 'discount',
        range_type: detectedRangeType,
        description: entry.description || '',
        discount:
          entry.discount !== undefined ? String(normalizeRateCardDiscount(entry.discount)) : '',
        unit: entry.unit || 'rs/unit',
        entries: [
          {
            range: {
              min:
                typeof entry.range?.min === 'number'
                  ? entry.range.min.toString()
                  : String(entry.range?.min || ''),
              max:
                typeof entry.range?.max === 'number'
                  ? entry.range.max.toString()
                  : String(entry.range?.max || ''),
            },
            standard_specification: entry.standard_specification || '',
            basic_size: entry.basic_size !== undefined ? String(entry.basic_size) : undefined,
            least_count:
              entry.least_count !== undefined ? String(entry.least_count) : undefined,
            rate: typeof entry.rate === 'number' ? entry.rate.toString() : String(entry.rate || ''),
          },
        ],
      });
      return;
    }

    reset({
      gauge_id: '',
      rate_type: 'discount',
      range_type: 'range',
      description: '',
      discount: '',
      unit: 'rs/unit',
      entries: [createEmptyRateRow()],
    });
  }, [entry, reset]);

  useEffect(() => {
    if (!showLeastCount) {
      fields.forEach((_, index) => {
        setValue(`entries.${index}.least_count`, undefined, { shouldValidate: false });
      });
    }
  }, [fields, setValue, showLeastCount]);

  const handleRangeTypeChange = (value: RangeType) => {
    setValue('range_type', value, { shouldDirty: true, shouldValidate: true });
    replace(
      fields.map(() => ({
        ...createEmptyRateRow(),
        rate: '',
      }))
    );
  };

  const handleAddRow = () => {
    append(createEmptyRateRow());
  };

  const onSubmit = handleSubmit(async (data: RateCardFormData) => {
    const entries = data.entries.map((row): RateCardEntry & { gauge_id?: string } => {
      const entryData: RateCardEntry & { gauge_id?: string } = {
        rate_type: data.rate_type,
        description: data.description || '',
        rate: row.rate,
        unit: data.unit,
        range_unit: data.unit,
        gauge_id: data.gauge_id,
        discount: data.rate_type === 'discount' ? data.discount || 0 : 0,
        range: { min: 0, max: 0 },
      };

      if (data.range_type === 'range' && row.range) {
        entryData.range = {
          min: row.range.min,
          max: row.range.max,
        };
      } else if (data.range_type === 'specification' && row.standard_specification) {
        entryData.standard_specification = row.standard_specification;
      } else if (data.range_type === 'basic_size' && row.basic_size !== undefined) {
        entryData.basic_size = row.basic_size;
      }

      if (showLeastCount && row.least_count !== undefined) {
        entryData.least_count = row.least_count;
      }

      return entryData;
    });

    if (entry || !onSaveMany) {
      await onSave(entries[0]);
    } else {
      await onSaveMany(entries);
    }

    if (!entry) {
      reset({
        gauge_id: data.gauge_id,
        rate_type: data.rate_type,
        range_type: data.range_type,
        description: data.description || '',
        discount: data.rate_type === 'discount' ? data.discount : '',
        unit: data.unit,
        entries: [createEmptyRateRow()],
      });
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-label="Rate card entry form">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mt-2">
        <FormField label="Gauge" required error={errors.gauge_id?.message}>
          <Controller
            name="gauge_id"
            control={control}
            render={({ field, fieldState }) => (
              <ComboBox
                aria-label="Search and select gauge"
                selectedKey={field.value || null}
                onSelectionChange={(key) => {
                  field.onChange(key || '');
                }}
                isInvalid={fieldState.invalid}
                defaultFilter={contains}
                className="w-full"
              >
                <ComboBox.InputGroup className="w-full">
                  <Input ref={field.ref} onBlur={field.onBlur} placeholder="Search gauge..." className={fieldState.invalid ? INVALID_INPUT_WRAPPER : INPUT_CLASS_NAMES.input} />
                  <ComboBox.Trigger />
                </ComboBox.InputGroup>
                <ComboBox.Popover>
                  <ListBox>
                    {gaugeMastersQuery.isPending ? (
                      <ListBox.Item id="loading-gauges" isDisabled>Loading gauges...</ListBox.Item>
                    ) : (
                      gaugeMasterList.map((gauge: { id: string; name: string }) => (
                        <ListBox.Item key={gauge.id} id={gauge.id} textValue={gauge.name}>
                          {gauge.name}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))
                    )}
                  </ListBox>
                </ComboBox.Popover>
              </ComboBox>
            )}
          />
        </FormField>

        <FormField label="Rate Type" required error={errors.rate_type?.message}>
          <Controller
            name="rate_type"
            control={control}
            render={({ field, fieldState }) => (
              <Select
                aria-label="Select rate type"
                placeholder="Select type"
                selectedKey={field.value || null}
                onSelectionChange={(keys) => {
                  const value = keys as 'discount' | 'flat' | undefined;
                  field.onChange(value || 'discount');
                  if (value === 'flat') {
                    setValue('discount', 0, { shouldDirty: true, shouldValidate: true });
                  }
                }}
                isInvalid={fieldState.invalid}
                className="w-full"
              >
                <Select.Trigger className={SELECT_CLASS_NAMES.trigger}><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="discount" textValue="Discount">Discount<ListBox.ItemIndicator /></ListBox.Item>
                    <ListBox.Item id="flat" textValue="Flat">Flat<ListBox.ItemIndicator /></ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
          />
        </FormField>

        <FormField label="Range Type" required error={errors.range_type?.message}>
          <Controller
            name="range_type"
            control={control}
            render={({ field, fieldState }) => (
              <Select
                aria-label="Select range type"
                placeholder="Select type"
                selectedKey={field.value || null}
                onSelectionChange={(keys) => {
                  const value = keys as RangeType | undefined;
                  handleRangeTypeChange(value || 'range');
                }}
                isInvalid={fieldState.invalid}
                className="w-full"
              >
                <Select.Trigger className={SELECT_CLASS_NAMES.trigger}><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="range" textValue="Range">Range<ListBox.ItemIndicator /></ListBox.Item>
                    <ListBox.Item id="specification" textValue="Specification">Specification<ListBox.ItemIndicator /></ListBox.Item>
                    <ListBox.Item id="basic_size" textValue="Basic Size">Basic Size<ListBox.ItemIndicator /></ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
          />
        </FormField>

        <FormField label="Unit" required error={errors.unit?.message}>
          <Input
            {...register('unit')}
            aria-label="Unit"
            placeholder="rs/unit"
            aria-invalid={Boolean(errors.unit)}
            className={errors.unit ? INVALID_INPUT_WRAPPER : INPUT_CLASS_NAMES.input}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FormField label="Discount %" required={rateType === 'discount'} error={errors.discount?.message}>
          <Input
            {...register('discount')}
            aria-label="Discount"
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="0"
            disabled={rateType === 'flat'}
            aria-invalid={Boolean(errors.discount)}
            className={errors.discount ? INVALID_INPUT_WRAPPER : INPUT_CLASS_NAMES.input}
          />
        </FormField>

        <div className="md:col-span-2 xl:col-span-3">
          <FormField label="Description (Optional)" error={errors.description?.message}>
            <Input
              {...register('description')}
              aria-label="Description"
              placeholder="Enter description..."
              aria-invalid={Boolean(errors.description)}
              className={errors.description ? INVALID_INPUT_WRAPPER : INPUT_CLASS_NAMES.input}
            />
          </FormField>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Pricing Rows</h3>
            <p className="text-xs text-slate-500">
              {selectedGaugeName || 'Select a gauge'} | {fields.length} {fields.length === 1 ? 'row' : 'rows'}
            </p>
          </div>
          {!entry && (
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-2 px-3 text-sm"
              onClick={handleAddRow}
            >
              <PlusIcon className="h-4 w-4" />
              Add Row
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full table-auto">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100">
                <th className="px-3 py-3 text-left text-[11px] font-semibold tracking-[0.08em] text-slate-600">
                  SR NO
                </th>
                {rangeType === 'range' && (
                  <>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold tracking-[0.08em] text-slate-600">
                      RANGE MIN
                    </th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold tracking-[0.08em] text-slate-600">
                      RANGE MAX
                    </th>
                  </>
                )}
                {rangeType === 'specification' && (
                  <th className="px-3 py-3 text-left text-[11px] font-semibold tracking-[0.08em] text-slate-600">
                    SPECIFICATION
                  </th>
                )}
                {rangeType === 'basic_size' && (
                  <th className="px-3 py-3 text-left text-[11px] font-semibold tracking-[0.08em] text-slate-600">
                    BASIC SIZE
                  </th>
                )}
                {showLeastCount && (
                  <th className="px-3 py-3 text-left text-[11px] font-semibold tracking-[0.08em] text-slate-600">
                    LEAST COUNT
                  </th>
                )}
                <th className="px-3 py-3 text-left text-[11px] font-semibold tracking-[0.08em] text-slate-600">
                  RATE
                </th>
                <th className="px-3 py-3 text-center text-[11px] font-semibold tracking-[0.08em] text-slate-600">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const currentRowErrors = rowErrors[index];
                const rangeError =
                  currentRowErrors && 'range' in currentRowErrors
                    ? currentRowErrors.range
                    : undefined;

                return (
                  <tr key={field.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="w-[80px] px-3 py-3 align-top text-sm font-medium text-slate-700">
                      {index + 1}
                    </td>

                    {rangeType === 'range' && (
                      <>
                        <td className="min-w-[160px] px-3 py-3 align-top">
                          <Input
                            {...register(`entries.${index}.range.min`)}
                            aria-label={`Range minimum row ${index + 1}`}
                            type="number"
                            step="0.01"
                            placeholder="0"
                            aria-invalid={Boolean(rangeError && 'min' in rangeError && rangeError.min)}
                            className={
                              rangeError && 'min' in rangeError && rangeError.min
                                ? INVALID_COMPACT_INPUT_WRAPPER
                                : COMPACT_INPUT_CLASS_NAMES.input
                            }
                          />
                        </td>
                        <td className="min-w-[160px] px-3 py-3 align-top">
                          <Input
                            {...register(`entries.${index}.range.max`)}
                            aria-label={`Range maximum row ${index + 1}`}
                            type="number"
                            step="0.01"
                            placeholder="0"
                            aria-invalid={Boolean(rangeError && 'max' in rangeError && rangeError.max)}
                            className={
                              rangeError && 'max' in rangeError && rangeError.max
                                ? INVALID_COMPACT_INPUT_WRAPPER
                                : COMPACT_INPUT_CLASS_NAMES.input
                            }
                          />
                        </td>
                      </>
                    )}

                    {rangeType === 'specification' && (
                      <td className="min-w-[320px] px-3 py-3 align-top">
                        <Controller
                          name={`entries.${index}.standard_specification`}
                          control={control}
                          render={({ field: specField, fieldState }) => (
                            <ComboBox
                              aria-label={`Specification row ${index + 1}`}
                              selectedKey={specField.value || null}
                              onSelectionChange={(key) => specField.onChange(key || '')}
                              isInvalid={fieldState.invalid}
                              defaultFilter={contains}
                              className="w-full"
                            >
                              <ComboBox.InputGroup className="w-full">
                                <Input ref={specField.ref} onBlur={specField.onBlur} placeholder="Search spec..." className={fieldState.invalid ? INVALID_COMPACT_INPUT_WRAPPER : COMPACT_INPUT_CLASS_NAMES.input} />
                                <ComboBox.Trigger />
                              </ComboBox.InputGroup>
                              <ComboBox.Popover>
                                <ListBox>
                                  {threadRingPlugsQuery.isPending || taperThreadReadingsQuery.isPending ? (
                                    <ListBox.Item id="loading-specifications" isDisabled>Loading specifications...</ListBox.Item>
                                  ) : (
                                    specifications.map((spec) => (
                                      <ListBox.Item key={spec.value} id={spec.value} textValue={`${spec.label} (${spec.type === 'plain-thread' ? 'Plain' : 'Taper'})`}>
                                        <div className="flex flex-col">
                                          <span className="text-sm">{spec.label}</span>
                                          <span className="text-xs text-gray-500">
                                            {spec.type === 'plain-thread' ? 'Plain Thread' : 'Taper Thread'}
                                          </span>
                                        </div>
                                        <ListBox.ItemIndicator />
                                      </ListBox.Item>
                                    ))
                                  )}
                                </ListBox>
                              </ComboBox.Popover>
                            </ComboBox>
                          )}
                        />
                      </td>
                    )}

                    {rangeType === 'basic_size' && (
                      <td className="min-w-[180px] px-3 py-3 align-top">
                        <Input
                          {...register(`entries.${index}.basic_size`)}
                          aria-label={`Basic size row ${index + 1}`}
                          type="number"
                          step="0.01"
                          placeholder="0"
                          aria-invalid={Boolean(currentRowErrors?.basic_size)}
                          className={
                            currentRowErrors?.basic_size
                              ? INVALID_COMPACT_INPUT_WRAPPER
                              : COMPACT_INPUT_CLASS_NAMES.input
                          }
                        />
                      </td>
                    )}

                    {showLeastCount && (
                      <td className="min-w-[160px] px-3 py-3 align-top">
                        <Input
                          {...register(`entries.${index}.least_count`)}
                          aria-label={`Least count row ${index + 1}`}
                          type="number"
                          step="0.0001"
                          placeholder="0.001"
                          className={COMPACT_INPUT_CLASS_NAMES.input}
                        />
                      </td>
                    )}

                    <td className="min-w-[160px] px-3 py-3 align-top">
                      <Input
                        {...register(`entries.${index}.rate`)}
                        aria-label={`Rate row ${index + 1}`}
                        type="number"
                        step="0.01"
                        placeholder="0"
                        aria-invalid={Boolean(currentRowErrors?.rate)}
                        className={
                          currentRowErrors?.rate
                            ? INVALID_COMPACT_INPUT_WRAPPER
                            : COMPACT_INPUT_CLASS_NAMES.input
                        }
                      />
                    </td>

                    <td className="w-[110px] px-3 py-3 align-top">
                      <div className="flex justify-center">
                        <Button
                          type="button"
                          size="sm"
                          aria-label={`Remove row ${index + 1}`}
                          className="h-9 w-9 min-w-9 rounded-lg border border-red-500 bg-white text-red-600 hover:bg-red-50"
                          disabled={fields.length === 1 || Boolean(entry)}
                          onClick={() => remove(index)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>



      <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
        {entry && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="px-4 h-9 text-sm"
            aria-label="Cancel"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 px-6 h-9 text-sm text-white disabled:bg-blue-300 disabled:text-white"
          disabled={isSubmitting || saving}
          aria-label={entry ? 'Update entry' : 'Add entries'}
        >
          {isSubmitting || saving
            ? 'Saving...'
            : entry
              ? 'Update'
              : `Add ${fields.length} ${fields.length === 1 ? 'Entry' : 'Entries'}`}
        </Button>
      </div>
    </form>
  );
};
