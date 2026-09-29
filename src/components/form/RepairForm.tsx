"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Input,
  Select,
  Autocomplete,
  ListBox,
  Button,
  TextArea,
  Card,
  Table,
} from "@heroui/react";
import {
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { 
  RepairFormData, 
  SparePart, 
  GaugeSpecifications,
  RepairFormProps 
} from "../../types/repair";
import type { GaugeMaster } from "../../store/useStore";

const RepairForm = ({
  initialData,
  isEditing = false,
  onSubmit,
  onCancel,
  gaugeMasterList,
  organizations,
  isSubmitting = false,
}: RepairFormProps) => {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting: formIsSubmitting },
  } = useForm<RepairFormData>({
    defaultValues: {
      repair_date: new Date().toISOString().split('T')[0],
      client_org_id: '',
      gauge_id: '',
      gauge_identification_number: '',
      gauge_make: '',
      gauge_manf_serial_number: '',
      gauge_type: '',
      gauge_specifications: {},
      repair_description: '',
      repair_status: 'pending',
      estimated_cost: 0,
      estimated_completion_date: '',
      technician_name: '',
      technician_notes: '',
      client_approval_required: false,
      spare_parts: [],
      ...initialData,
    },
  });

  const [selectedGauge, setSelectedGauge] = useState<GaugeMaster | null>(null);
  const [spareParts, setSpareParts] = useState<SparePart[]>(initialData?.spare_parts || []);

  // Watch gauge selection
  const gaugeSpecs = watch('gauge_specifications');
  const selectedGaugeId = watch('gauge_id');
  const selectedGaugeType = watch('gauge_type');

  // Handle gauge selection
  const handleGaugeSelect = useCallback((gaugeId: string) => {
    const gauge = gaugeMasterList.find(g => g.id === gaugeId);
    if (gauge) {
      setSelectedGauge(gauge);
      setValue('gauge_id', gaugeId);
      setValue('gauge_type', gauge.name);
      
      // Auto-populate gauge specifications based on gauge type
      const specs: GaugeSpecifications = {};
      
      // Example specifications based on gauge type - this can be enhanced
      if (gauge.name.toLowerCase().includes('plug')) {
        specs.range = { min: 0, max: 25, unit: 'mm' };
        specs.least_count = { value: 0.01, unit: 'mm' };
        specs.basic_size = { value: 10, unit: 'mm' };
        specs.accuracy = { value: 0.002, unit: 'mm' };
      } else if (gauge.name.toLowerCase().includes('ring')) {
        specs.range = { min: 10, max: 100, unit: 'mm' };
        specs.least_count = { value: 0.01, unit: 'mm' };
        specs.basic_size = { value: 50, unit: 'mm' };
        specs.accuracy = { value: 0.003, unit: 'mm' };
      } else if (gauge.name.toLowerCase().includes('caliper')) {
        specs.range = { min: 0, max: 150, unit: 'mm' };
        specs.least_count = { value: 0.02, unit: 'mm' };
        specs.accuracy = { value: 0.03, unit: 'mm' };
      } else {
        // Default specifications
        specs.range = { min: 0, max: 50, unit: 'mm' };
        specs.least_count = { value: 0.01, unit: 'mm' };
        specs.basic_size = { value: 25, unit: 'mm' };
        specs.accuracy = { value: 0.002, unit: 'mm' };
      }
      
      setValue('gauge_specifications', specs);
    }
  }, [gaugeMasterList, setValue]);

  // Add new spare part
  const addSparePart = useCallback(() => {
    const newPart: SparePart = {
      id: Date.now().toString(),
      repair_id: '', // Will be set when form is submitted
      part_name: '',
      part_description: '',
      make: '',
      part_number: '',
      quantity: 1,
      unit_rate: 0,
      total_amount: 0,
      used_in_repair: true,
      notes: '',
    };
    setSpareParts(prev => [...prev, newPart]);
  }, []);

  // Update spare part
  const updateSparePart = useCallback((index: number, field: keyof SparePart, value: SparePart[keyof SparePart]) => {
    setSpareParts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Auto-calculate total amount when quantity or unit_rate changes
      if (field === 'quantity' || field === 'unit_rate') {
        updated[index].total_amount = updated[index].quantity * updated[index].unit_rate;
      }
      
      return updated;
    });
  }, []);

  // Remove spare part
  const removeSparePart = useCallback((index: number) => {
    setSpareParts(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Calculate total spare parts cost
  const totalSparePartsCost = useMemo(() => {
    return spareParts.reduce((total, part) => total + part.total_amount, 0);
  }, [spareParts]);

  // Update estimated cost when spare parts change
  useEffect(() => {
    setValue('estimated_cost', totalSparePartsCost);
  }, [totalSparePartsCost, setValue]);

  // Rehydrate selected gauge during edit mode (or after async master list load)
  useEffect(() => {
    if (!initialData?.gauge_id || selectedGauge || gaugeMasterList.length === 0) {
      return;
    }

    const matchedGauge = gaugeMasterList.find((gauge) => gauge.id === initialData.gauge_id);
    if (matchedGauge) {
      setSelectedGauge(matchedGauge);
      if (!selectedGaugeType) {
        setValue('gauge_type', matchedGauge.name);
      }
    }
  }, [gaugeMasterList, initialData?.gauge_id, selectedGauge, selectedGaugeType, setValue]);

  // Form submission
  const onFormSubmit = useCallback(async (data: RepairFormData) => {
    try {
      const formData = {
        ...data,
        spare_parts: spareParts,
        estimated_cost: totalSparePartsCost,
      };
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  }, [onSubmit, spareParts, totalSparePartsCost]);

  // Render gauge specifications
  const renderGaugeSpecifications = useCallback((specs: GaugeSpecifications) => {
    return (
      <div className="space-y-2">
        {specs.range && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Range:</span>
            <span className="text-sm font-medium">
              {specs.range.min} - {specs.range.max} {specs.range.unit}
            </span>
          </div>
        )}
        {specs.least_count && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Least Count:</span>
            <span className="text-sm font-medium">
              {specs.least_count.value} {specs.least_count.unit}
            </span>
          </div>
        )}
        {specs.basic_size && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Basic Size:</span>
            <span className="text-sm font-medium">
              {specs.basic_size.value} {specs.basic_size.unit}
            </span>
          </div>
        )}
        {specs.accuracy && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Accuracy:</span>
            <span className="text-sm font-medium">
              ±{specs.accuracy.value} {specs.accuracy.unit}
            </span>
          </div>
        )}
      </div>
    );
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Card>
        <Card.Header className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <h2 className="text-xl font-bold">
            {isEditing ? 'Edit Repair' : 'Create New Repair'}
          </h2>
        </Card.Header>
        <Card.Content>
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
            <input type="hidden" {...register('gauge_id', { required: 'Gauge selection is required' })} />
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repair Date *
                </label>
                <Input
                  className="w-full"
                  type="date"
                  {...register('repair_date', { required: 'Repair date is required' })}
                  aria-invalid={!!errors.repair_date}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Organization *
                </label>
                <Controller
                  name="client_org_id"
                  control={control}
                  rules={{ required: 'Client organization is required' }}
                  render={({ field }) => (
                    <Select className="w-full" selectedKey={field.value || null} onSelectionChange={(key) => field.onChange(key ? String(key) : '')} placeholder="Select organization">
                      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                      <Select.Popover><ListBox>{organizations.map((org) => <ListBox.Item key={org.id} id={org.id} textValue={org.name}>{org.name}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Gauge Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Gauge Information</h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search & Select Gauge *
                  </label>
                  <Autocomplete className="w-full"
                    selectedKey={selectedGaugeId || null}
                    onSelectionChange={(key) => {
                      const gaugeId = key as string | null;
                      if (!gaugeId) {
                        setSelectedGauge(null);
                        setValue('gauge_id', '');
                        setValue('gauge_type', '');
                        setValue('gauge_specifications', {});
                        return;
                      }
                      handleGaugeSelect(gaugeId);
                    }}
                    >
                    <Autocomplete.Trigger>
                      <Autocomplete.Filter><Input aria-label="Search gauge" placeholder="Search by gauge name or standard no..." /></Autocomplete.Filter>
                      <Autocomplete.Indicator />
                    </Autocomplete.Trigger>
                    <Autocomplete.Popover><ListBox>{gaugeMasterList.length ? gaugeMasterList.map((gauge) => (
                      <ListBox.Item key={gauge.id} id={gauge.id} textValue={`${gauge.name} ${gauge.is_standard_no}`}>
                        <div className="flex flex-col"><span>{gauge.name}</span><span className="text-xs text-gray-500">Standard No: {gauge.is_standard_no}</span></div>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    )) : <ListBox.Item id="no-gauges" isDisabled>No gauges found</ListBox.Item>}</ListBox></Autocomplete.Popover>
                  </Autocomplete>
                </div>
              </div>

              {selectedGauge && (
                <Card className="bg-blue-50 border-blue-200">
                  <Card.Content>
                    <h4 className="font-semibold text-blue-800 mb-2">Gauge Specifications</h4>
                    {renderGaugeSpecifications(gaugeSpecs)}
                  </Card.Content>
                </Card>
              )}
            </div>

            {/* Repair Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Repair Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Repair Status *
                  </label>
                  <Controller
                    name="repair_status"
                    control={control}
                    rules={{ required: 'Repair status is required' }}
                    render={({ field }) => (
                      <Select className="w-full" selectedKey={field.value || null} onSelectionChange={(key) => field.onChange(key ? String(key) : '')} placeholder="Select status">
                        <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                        <Select.Popover><ListBox>
                          {[['pending', 'Pending'], ['in_progress', 'In Progress'], ['completed', 'Completed'], ['on_hold', 'On Hold'], ['cancelled', 'Cancelled']].map(([key, label]) => <ListBox.Item key={key} id={key} textValue={label}>{label}<ListBox.ItemIndicator /></ListBox.Item>)}
                        </ListBox></Select.Popover>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Completion Date *
                  </label>
                  <Input
                    className="w-full"
                    type="date"
                    {...register('estimated_completion_date', { 
                      required: 'Estimated completion date is required' 
                    })}
                    aria-invalid={!!errors.estimated_completion_date}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Technician Name *
                  </label>
                  <Input
                    className="w-full"
                    {...register('technician_name', { 
                      required: 'Technician name is required' 
                    })}
                    placeholder="Enter technician name"
                    aria-invalid={!!errors.technician_name}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Cost
                  </label>
                  <Input
                    type="number"
                    value={totalSparePartsCost.toString()}
                    readOnly
                    placeholder="Auto-calculated from spare parts"
                    className="w-full bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repair Description *
                </label>
                <TextArea
                  className="w-full"
                  {...register('repair_description', { 
                    required: 'Repair description is required' 
                    })}
                  placeholder="Describe the repair work needed..."
                  rows={3}
                  aria-invalid={!!errors.repair_description}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Technician Notes
                </label>
                <TextArea
                  className="w-full"
                  {...register('technician_notes')}
                  placeholder="Additional notes from technician..."
                  rows={2}
                />
              </div>
            </div>

            {/* Spare Parts */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Spare Parts</h3>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addSparePart}
                >
                  Add Spare Part
                </Button>
              </div>

              {spareParts.length > 0 && (
                <div className="overflow-x-auto">
                  <Table aria-label="Spare parts table">
                    <Table.ScrollContainer><Table.Content>
                      <Table.Header>
                        <Table.Column id="part_name">Part Name</Table.Column>
                        <Table.Column id="make">Make</Table.Column>
                        <Table.Column id="part_number">Part Number</Table.Column>
                        <Table.Column id="quantity">Quantity</Table.Column>
                        <Table.Column id="unit_rate">Unit Rate</Table.Column>
                        <Table.Column id="total_amount">Total Amount</Table.Column>
                        <Table.Column id="actions">Actions</Table.Column>
                      </Table.Header>
                      <Table.Body items={spareParts}>
                        {(part) => {
                          const index = spareParts.indexOf(part);
                          return <Table.Row id={part.id}>
                          <Table.Cell>
                            <Input
                              value={part.part_name}
                              onChange={(e) => updateSparePart(index, 'part_name', e.target.value)}
                              placeholder="Part name"
                            />
                          </Table.Cell>
                          <Table.Cell>
                            <Input
                              value={part.make}
                              onChange={(e) => updateSparePart(index, 'make', e.target.value)}
                              placeholder="Make"
                            />
                          </Table.Cell>
                          <Table.Cell>
                            <Input
                              value={part.part_number || ''}
                              onChange={(e) => updateSparePart(index, 'part_number', e.target.value)}
                              placeholder="Part number"
                            />
                          </Table.Cell>
                          <Table.Cell>
                            <Input
                              type="number"
                              value={part.quantity.toString()}
                              onChange={(e) => updateSparePart(index, 'quantity', parseInt(e.target.value) || 0)}
                              min="1"
                            />
                          </Table.Cell>
                          <Table.Cell>
                            <Input
                              type="number"
                              value={part.unit_rate.toString()}
                              onChange={(e) => updateSparePart(index, 'unit_rate', parseFloat(e.target.value) || 0)}
                              min="0"
                            />
                          </Table.Cell>
                          <Table.Cell>
                            <div className="font-medium">
                              ₹{part.total_amount.toFixed(2)}
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <Button
                              type="button"
                              isIconOnly
                              size="sm"
                              variant="danger-soft"
                              onClick={() => removeSparePart(index)}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </Table.Cell>
                        </Table.Row>;
                        }}
                      </Table.Body>
                    </Table.Content></Table.ScrollContainer>
                  </Table>
                  
                  <div className="mt-4 text-right">
                    <div className="text-lg font-semibold">
                      Total Spare Parts Cost: ₹{totalSparePartsCost.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                isDisabled={isSubmitting || formIsSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isDisabled={!selectedGaugeId || isSubmitting || formIsSubmitting}
              >
                {isEditing ? 'Update Repair' : 'Create Repair'}
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
};

export default RepairForm;
