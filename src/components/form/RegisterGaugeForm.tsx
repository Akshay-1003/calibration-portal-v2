import React, { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
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

  const selectTriggerClassName = (hasError: boolean) =>
    hasError ? 'border-red-500 focus:ring-red-500' : '';

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
            <Select
              value={watchedValues.gaugeClass}
              onValueChange={(value) =>
                setValue('gaugeClass', value as RegisterGaugeFormData['gaugeClass'], {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger className={selectTriggerClassName(!!errors.gaugeClass)}>
                <SelectValue placeholder="Select gauge class" />
              </SelectTrigger>
              <SelectContent>
                {GAUGE_CLASSES.map((gaugeClass) => (
                  <SelectItem key={gaugeClass} value={gaugeClass}>
                    {gaugeClass.charAt(0).toUpperCase() + gaugeClass.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Select
              value={watchedValues.calibrationFrequencyUnit}
              onValueChange={(value) =>
                setValue(
                  'calibrationFrequencyUnit',
                  value as RegisterGaugeFormData['calibrationFrequencyUnit'],
                  {
                    shouldDirty: true,
                    shouldValidate: true,
                  },
                )
              }
            >
              <SelectTrigger className={selectTriggerClassName(!!errors.calibrationFrequencyUnit)}>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {CALIBRATION_FREQUENCY_UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit.charAt(0).toUpperCase() + unit.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.calibrationFrequencyUnit && (
              <p className="text-sm text-red-500 mt-1">{errors.calibrationFrequencyUnit.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="process">Process *</Label>
            <Select
              value={watchedValues.process}
              onValueChange={(value) =>
                setValue('process', value as RegisterGaugeFormData['process'], {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger className={selectTriggerClassName(!!errors.process)}>
                <SelectValue placeholder="Select process" />
              </SelectTrigger>
              <SelectContent>
                {PROCESSES.map((process) => (
                  <SelectItem key={process} value={process}>
                    {process.charAt(0).toUpperCase() + process.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.process && (
              <p className="text-sm text-red-500 mt-1">{errors.process.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="unit">Unit *</Label>
            <Select
              value={watchedValues.unit}
              onValueChange={(value) =>
                setValue('unit', value as RegisterGaugeFormData['unit'], {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger className={selectTriggerClassName(!!errors.unit)}>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Select
              value={watchedValues.calibrationLocationType}
              onValueChange={(value) =>
                setValue(
                  'calibrationLocationType',
                  value as RegisterGaugeFormData['calibrationLocationType'],
                  {
                    shouldDirty: true,
                    shouldValidate: true,
                  },
                )
              }
            >
              <SelectTrigger className={selectTriggerClassName(!!errors.calibrationLocationType)}>
                <SelectValue placeholder="Select location type" />
              </SelectTrigger>
              <SelectContent>
                {CALIBRATION_LOCATION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Select
              value={watchedValues.calibrationDoneUnder}
              onValueChange={(value) =>
                setValue(
                  'calibrationDoneUnder',
                  value as RegisterGaugeFormData['calibrationDoneUnder'],
                  {
                    shouldDirty: true,
                    shouldValidate: true,
                  },
                )
              }
            >
              <SelectTrigger className={selectTriggerClassName(!!errors.calibrationDoneUnder)}>
                <SelectValue placeholder="Select standard" />
              </SelectTrigger>
              <SelectContent>
                {CALIBRATION_DONE_UNDER.map((standard) => (
                  <SelectItem key={standard} value={standard}>
                    {standard.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.calibrationDoneUnder && (
              <p className="text-sm text-red-500 mt-1">{errors.calibrationDoneUnder.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="gaugeCondition">Gauge Condition *</Label>
            <Select
              value={watchedValues.gaugeCondition}
              onValueChange={(value) =>
                setValue('gaugeCondition', value as RegisterGaugeFormData['gaugeCondition'], {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger className={selectTriggerClassName(!!errors.gaugeCondition)}>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {GAUGE_CONDITIONS.map((condition) => (
                  <SelectItem key={condition} value={condition}>
                    {condition.charAt(0).toUpperCase() + condition.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
