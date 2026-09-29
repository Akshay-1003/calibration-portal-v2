import React, { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ListBox, Select } from '@heroui/react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';
import { registerGaugeFormSchema, zodResolver, type RegisterGaugeFormData } from '../../lib/validations';

// Types
interface RegisterGaugeFormProps {
  onSubmit: (data: RegisterGaugeFormData) => void;
  loading?: boolean;
  initialData?: Partial<RegisterGaugeFormData>;
}

// Constants
const GAUGE_CLASSES = [
  'digital',
  'analog',
  'mechanical',
  'electronic',
  'optical',
];

const CALIBRATION_FREQUENCY_UNITS = [
  'months',
  'days',
  'weeks',
  'years',
];

const PROCESSES = [
  'calibration',
  'verification',
  'testing',
  'inspection',
];

const UNITS = [
  'mm',
  'cm',
  'm',
  'in',
  'ft',
];

const CALIBRATION_LOCATION_TYPES = [
  'permanent_facility',
  'on_site',
  'mobile',
];

const CALIBRATION_DONE_UNDER = [
  'nabl',
  'non_nabl',
];

const GAUGE_CONDITIONS = [
  'excellent',
  'good',
  'fair',
  'poor',
  'damaged',
];

const FormSelect = ({
  value,
  options,
  placeholder,
  hasError,
  onChange,
}: {
  value: string;
  options: string[];
  placeholder: string;
  hasError: boolean;
  onChange: (value: string) => void;
}) => (
  <Select
    className="w-full"
    selectedKey={value || null}
    onSelectionChange={(key) => onChange(key ? String(key) : '')}
    aria-label={placeholder}
  >
    <Select.Trigger className={`w-full ${hasError ? 'border-red-500' : ''}`}>
      <Select.Value />
      <Select.Indicator />
    </Select.Trigger>
    <Select.Popover>
      <ListBox>
        {options.map((option) => (
          <ListBox.Item key={option} id={option} textValue={option}>
            {option.charAt(0).toUpperCase() + option.slice(1).replaceAll('_', ' ')}
            <ListBox.ItemIndicator />
          </ListBox.Item>
        ))}
      </ListBox>
    </Select.Popover>
  </Select>
);

export const RegisterGaugeForm: React.FC<RegisterGaugeFormProps> = ({
  onSubmit,
  loading = false,
  initialData = {},
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<RegisterGaugeFormData>({
    resolver: zodResolver(registerGaugeFormSchema),
    defaultValues: {
      gaugeName: '',
      gaugeClass: 'digital',
      make: '',
      identificationNumber: '',
      serialNumber: '',
      calibrationFrequency: '12',
      calibrationFrequencyUnit: 'months',
      process: 'calibration',
      unit: 'mm',
      calibrationLocationType: 'permanent_facility',
      calibrationLocation: '',
      calibrationDoneUnder: 'nabl',
      gaugeCondition: 'excellent',
      ...initialData,
    },
    mode: 'onChange',
  });

  const watchedValues = watch();

  const handleFormSubmit = useCallback((data: RegisterGaugeFormData) => {
    try {
      onSubmit(data);
      toast.success('Gauge registered successfully!');
    } catch {
      toast.error('Failed to register gauge. Please try again.');
    }
  }, [onSubmit]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  // Memoized form sections
  const BasicInfoSection = useMemo(() => (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="gaugeName">Gauge Name *</Label>
            <Input
              id="gaugeName"
              {...register('gaugeName', { required: 'Gauge name is required' })}
              placeholder="Enter gauge name"
            />
            {errors.gaugeName && (
              <p className="text-sm text-red-500 mt-1">{errors.gaugeName.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="gaugeClass">Gauge Class *</Label>
            <FormSelect
              value={watchedValues.gaugeClass}
              options={GAUGE_CLASSES}
              placeholder="Select gauge class"
              hasError={!!errors.gaugeClass}
              onChange={(value) => setValue('gaugeClass', value as RegisterGaugeFormData['gaugeClass'], { shouldDirty: true, shouldValidate: true })}
            />
            {errors.gaugeClass && (
              <p className="text-sm text-red-500 mt-1">{errors.gaugeClass.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="make">Make *</Label>
            <Input
              id="make"
              {...register('make', { required: 'Make is required' })}
              placeholder="Enter manufacturer"
            />
            {errors.make && (
              <p className="text-sm text-red-500 mt-1">{errors.make.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="identificationNumber">Identification Number *</Label>
            <Input
              id="identificationNumber"
              {...register('identificationNumber', { required: 'Identification number is required' })}
              placeholder="Enter identification number"
            />
            {errors.identificationNumber && (
              <p className="text-sm text-red-500 mt-1">{errors.identificationNumber.message}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="serialNumber">Serial Number *</Label>
          <Input
            id="serialNumber"
            {...register('serialNumber', { required: 'Serial number is required' })}
            placeholder="Enter serial number"
          />
          {errors.serialNumber && (
            <p className="text-sm text-red-500 mt-1">{errors.serialNumber.message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  ), [register, errors, watchedValues.gaugeClass, setValue]);

  const CalibrationInfoSection = useMemo(() => (
    <Card>
      <CardHeader>
        <CardTitle>Calibration Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="calibrationFrequency">Calibration Frequency *</Label>
            <Input
              id="calibrationFrequency"
              type="number"
              {...register('calibrationFrequency', { 
                required: 'Calibration frequency is required',
                min: { value: 1, message: 'Frequency must be at least 1' }
              })}
              placeholder="Enter frequency"
            />
            {errors.calibrationFrequency && (
              <p className="text-sm text-red-500 mt-1">{errors.calibrationFrequency.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="calibrationFrequencyUnit">Frequency Unit *</Label>
            <FormSelect
              value={watchedValues.calibrationFrequencyUnit}
              options={CALIBRATION_FREQUENCY_UNITS}
              placeholder="Select frequency unit"
              hasError={!!errors.calibrationFrequencyUnit}
              onChange={(value) => setValue('calibrationFrequencyUnit', value as RegisterGaugeFormData['calibrationFrequencyUnit'], { shouldDirty: true, shouldValidate: true })}
            />
            {errors.calibrationFrequencyUnit && (
              <p className="text-sm text-red-500 mt-1">{errors.calibrationFrequencyUnit.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="process">Process *</Label>
            <FormSelect
              value={watchedValues.process}
              options={PROCESSES}
              placeholder="Select process"
              hasError={!!errors.process}
              onChange={(value) => setValue('process', value as RegisterGaugeFormData['process'], { shouldDirty: true, shouldValidate: true })}
            />
            {errors.process && (
              <p className="text-sm text-red-500 mt-1">{errors.process.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="unit">Unit *</Label>
            <FormSelect
              value={watchedValues.unit}
              options={UNITS}
              placeholder="Select unit"
              hasError={!!errors.unit}
              onChange={(value) => setValue('unit', value as RegisterGaugeFormData['unit'], { shouldDirty: true, shouldValidate: true })}
            />
            {errors.unit && (
              <p className="text-sm text-red-500 mt-1">{errors.unit.message}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  ), [register, errors, watchedValues, setValue]);

  const LocationInfoSection = useMemo(() => (
    <Card>
      <CardHeader>
        <CardTitle>Location Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="calibrationLocationType">Location Type *</Label>
            <FormSelect
              value={watchedValues.calibrationLocationType}
              options={CALIBRATION_LOCATION_TYPES}
              placeholder="Select location type"
              hasError={!!errors.calibrationLocationType}
              onChange={(value) => setValue('calibrationLocationType', value as RegisterGaugeFormData['calibrationLocationType'], { shouldDirty: true, shouldValidate: true })}
            />
            {errors.calibrationLocationType && (
              <p className="text-sm text-red-500 mt-1">{errors.calibrationLocationType.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="calibrationLocation">Location *</Label>
            <Input
              id="calibrationLocation"
              {...register('calibrationLocation', { required: 'Location is required' })}
              placeholder="Enter calibration location"
            />
            {errors.calibrationLocation && (
              <p className="text-sm text-red-500 mt-1">{errors.calibrationLocation.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="calibrationDoneUnder">Calibration Standard *</Label>
            <FormSelect
              value={watchedValues.calibrationDoneUnder}
              options={CALIBRATION_DONE_UNDER}
              placeholder="Select standard"
              hasError={!!errors.calibrationDoneUnder}
              onChange={(value) => setValue('calibrationDoneUnder', value as RegisterGaugeFormData['calibrationDoneUnder'], { shouldDirty: true, shouldValidate: true })}
            />
            {errors.calibrationDoneUnder && (
              <p className="text-sm text-red-500 mt-1">{errors.calibrationDoneUnder.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="gaugeCondition">Gauge Condition *</Label>
            <FormSelect
              value={watchedValues.gaugeCondition}
              options={GAUGE_CONDITIONS}
              placeholder="Select condition"
              hasError={!!errors.gaugeCondition}
              onChange={(value) => setValue('gaugeCondition', value as RegisterGaugeFormData['gaugeCondition'], { shouldDirty: true, shouldValidate: true })}
            />
            {errors.gaugeCondition && (
              <p className="text-sm text-red-500 mt-1">{errors.gaugeCondition.message}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  ), [register, errors, watchedValues, setValue]);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {BasicInfoSection}
      {CalibrationInfoSection}
      {LocationInfoSection}
      
      <Separator />
      
      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={loading}
        >
          Reset
        </Button>
        <Button
          type="submit"
          disabled={loading}
        >
          {loading ? 'Registering...' : 'Register Gauge'}
        </Button>
      </div>
    </form>
    </div>
  );
};

export default RegisterGaugeForm;
