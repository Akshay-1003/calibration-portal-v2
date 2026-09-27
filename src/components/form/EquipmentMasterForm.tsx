"use client"

import { useForm, Controller } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Trash2, Plus } from "lucide-react"
import type { EquipmentRange } from "../../types/equipment"
import { Input, Button, DatePicker } from "@heroui/react"
import { parseDate } from "@internationalized/date"
import { equipmentMasterSchema, zodResolver, type EquipmentMasterFormData } from "../../lib/validations"
import { FormDateProvider } from "./FormDateProvider"
import { useEquipmentQuery } from "../../hooks/queries/equipments"
import { useEquipmentsWithQuery } from "../../hooks/useEquipmentsWithQuery"

// Define ApiError class if not imported
class ApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// Helper function to extract date part from ISO string
const extractDatePart = (dateString: string | null | undefined): string | null => {
  if (!dateString) return null;
  // Extract YYYY-MM-DD from ISO string (e.g., "2025-04-06T00:00:00" -> "2025-04-06")
  const match = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

interface EquipmentMasterFormProps {
  mode?: 'create' | 'edit';
  equipmentId?: string;
  onSuccess?: (data: any, mode: 'create' | 'edit') => void;
  onCancel?: () => void;
}

const EquipmentMasterForm = ({ mode = 'create', equipmentId, onSuccess, onCancel }: EquipmentMasterFormProps) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  
  const isEditMode = mode === "edit" && !!equipmentId

  // For edit mode, fetch the specific equipment
  const equipmentQuery = useEquipmentQuery(
    isEditMode ? equipmentId : null,
    { enabled: isEditMode }
  )
  
  const { createEquipment, updateEquipment, refreshEquipments } = useEquipmentsWithQuery()
  const [ranges, setRanges] = useState<EquipmentRange[]>([])
  const [newRange, setNewRange] = useState({ range: '', max_error: '' })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    control
  } = useForm<EquipmentMasterFormData>({
    resolver: zodResolver(equipmentMasterSchema),
    defaultValues: {
      equipment_name: "",
      code_no: "",
      make: "",
      serial_no: "",
      size_range: "",
      least_count: "",
      equipment_location: "",
      cal_agency: "",
      periodicity_no: "",
      reference_std: "",
      mfg_date: "",
      date_of_installation: "",
    },
    mode: "onChange"
  })

  // No mapping needed - form uses exact API field names

  // Load existing data in edit mode
  useEffect(() => {
    if (!isEditMode || !equipmentQuery.data) return

    const data = equipmentQuery.data as any;
    
    // Set form values directly from API response
    setValue('equipment_name', data.equipment_name || '');
    setValue('code_no', data.code_no || '');
    setValue('make', data.make || '');
    setValue('serial_no', data.serial_no || '');
    setValue('size_range', data.size_range || '');
    setValue('least_count', data.least_count || '');
    setValue('equipment_location', data.equipment_location || '');
    setValue('cal_agency', data.cal_agency || '');
    setValue('periodicity_no', data.periodicity_no || '');
    setValue('reference_std', data.reference_std || '');
    setValue('mfg_date', data.mfg_date ? (extractDatePart(data.mfg_date.toString()) || '') : '');
    setValue('date_of_installation', data.date_of_installation ? (extractDatePart(data.date_of_installation.toString()) || '') : '');
    
    setRanges(data.ranges || []);
  }, [isEditMode, equipmentQuery.data, setValue])

  useEffect(() => {
    if (isEditMode && equipmentQuery.isError) {
      toast.error("Failed to load equipment data")
      navigate('/masters/equipment-master')
    }
  }, [isEditMode, equipmentQuery.isError, navigate])

  // No mapping needed - form uses exact API field names

  const onSubmit = async (data: EquipmentMasterFormData) => {
    setLoading(true)
    try {
      // Add ranges to form data
      const equipmentData = {
        ...data,
        ranges: ranges.length > 0 ? ranges : undefined,
      };

      let response
      if (mode === 'edit' && equipmentId) {
        await updateEquipment(equipmentId, equipmentData as any)
        await refreshEquipments()
        toast.success("Equipment Master updated successfully!")
        response = { id: equipmentId, ...equipmentData }
      } else {
        response = await createEquipment(equipmentData as any)
        const responsePayload = (response as any)?.data ?? response
        await refreshEquipments()
        toast.success("Equipment Master created successfully!")
        response = responsePayload
      }

      if (response) {
        reset()
        setRanges([])
        setNewRange({ range: '', max_error: '' })

        // Call success callback
        if (onSuccess) {
          onSuccess(response, mode)
        } else {
          // Navigate back - no need for state since store is already updated
          navigate("/masters/equipment-master", { replace: true })
        }
      }
    } catch (error) {
      console.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} equipment master:`, error)
      const errorMessage = error instanceof ApiError ? error.message : `Failed to ${mode === 'edit' ? 'update' : 'create'} equipment master`
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRange = () => {
    if (newRange.range.trim() && newRange.max_error.trim()) {
      setRanges(prev => [...prev, newRange])
      setNewRange({ range: '', max_error: '' })
      toast.success('Range added successfully')
    } else {
      toast.error('Please fill both range and max error fields')
    }
  }

  const handleRangeChange = (field: 'range' | 'max_error', value: string) => {
    setNewRange(prev => ({ ...prev, [field]: value }))
  }

  const handleRemoveRange = (index: number) => {
    setRanges(prev => prev.filter((_, i) => i !== index))
    toast.success('Range removed')
  }



  const textFields = [
    { key: 'equipment_name', label: 'Equipment Name', placeholder: 'Enter equipment name', required: true },
    { key: 'code_no', label: 'Code No', placeholder: 'Enter code number', required: true },
    { key: 'make', label: 'Make', placeholder: 'Enter make/manufacturer', required: true },
    { key: 'serial_no', label: 'Serial Number', placeholder: 'Enter serial number', required: true },
    { key: 'size_range', label: 'Size Range', placeholder: 'Enter size range', required: true },
    { key: 'least_count', label: 'Least Count', placeholder: 'Enter least count', required: true },
    { key: 'equipment_location', label: 'Equipment Location', placeholder: 'Enter equipment location', required: true },
    { key: 'cal_agency', label: 'Calibration Agency', placeholder: 'Enter calibration agency', required: true },
    { key: 'periodicity_no', label: 'Periodicity', placeholder: 'Enter periodicity number', required: true },
    { key: 'reference_std', label: 'Reference Standard', placeholder: 'Enter reference standard', required: true },
  ]

  const dateFields = [
    { key: 'mfg_date', label: 'Manufacturing Date', required: true },
    { key: 'date_of_installation', label: 'Date of Installation in Lab:', required: true },
  ]


  const shouldShowLoading = isEditMode && (equipmentQuery.isFetching || equipmentQuery.isPending) && !equipmentQuery.data;

  if (shouldShowLoading) {
    return (
      <div className="w-full">
        <div className="shadow-lg border rounded-xl bg-card">
          <div className="bg-blue-600 text-white px-4 py-3 rounded-t-xl text-xl font-semibold">
            {mode === "edit" ? "Edit Equipment Master" : "New Equipment Master"}
          </div>
          <div className="p-8">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-muted-foreground">Loading equipment data...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <FormDateProvider>
      <div className="w-full">
        <div className="shadow-lg border rounded-xl bg-card">
          <div className="bg-blue-600 text-white px-4 py-3 rounded-t-xl text-xl font-semibold">
            {mode === "edit" ? "Edit Equipment Master" : "New Equipment Master"}
          </div>

          <div className="p-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* Equipment Master Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {textFields.map((field) => (
                  <Input
                    key={field.key}
                    label={field.label}
                    labelPlacement="outside"
                    placeholder={field.placeholder}
                    {...register(field.key as keyof EquipmentMasterFormData)}
                    isInvalid={!!errors[field.key as keyof EquipmentMasterFormData]}
                    errorMessage={errors[field.key as keyof EquipmentMasterFormData]?.message}
                  />
                ))}

             
                {dateFields.map((field) => (
                  <Controller
                    key={field.key}
                    name={field.key as keyof EquipmentMasterFormData}
                    control={control}
                    render={({ field: { onChange, value } }) => {
                      const dateValue = value ? extractDatePart(value) : null;
                      return (
                        <DatePicker
                          label={field.label}
                          labelPlacement="outside"
                          value={dateValue ? parseDate(dateValue) : null}
                          onChange={(date) => onChange(date ? date.toString() : "")}
                          isInvalid={!!errors[field.key as keyof EquipmentMasterFormData]}
                          errorMessage={errors[field.key as keyof EquipmentMasterFormData]?.message}
                        />
                      );
                    }}
                  />
                ))}
              </div>

              {/* Ranges Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-foreground">Equipment Ranges</h3>
                  <Button
                    type="button"
                    onClick={handleAddRange}
                    isDisabled={!newRange.range.trim() || !newRange.max_error.trim()}
                    color="primary"
                    size="sm"
                    startContent={<Plus className="h-4 w-4" />}
                  >
                    Add Range
                  </Button>
                </div>

                {/* Add New Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <Input
                    label="Range"
                    labelPlacement="outside"
                    value={newRange.range}
                    onChange={(e) => handleRangeChange('range', e.target.value)}
                    placeholder="Enter range (e.g., 0-50 mm)"
                  />

                  <Input
                    label="Max Error"
                    labelPlacement="outside"
                    value={newRange.max_error}
                    onChange={(e) => handleRangeChange('max_error', e.target.value)}
                    placeholder="Enter max error (e.g., ±0.02 mm)"
                  />
                </div>

                {/* Existing Ranges */}
                {ranges.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground">Current Ranges ({ranges.length})</h4>
                    <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3 bg-card">
                      {ranges.map((range, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium text-foreground">
                              Range: <span className="text-primary">{range.range}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Max Error: <span className="text-primary">{range.max_error}</span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="light"
                            size="sm"
                            onPress={() => handleRemoveRange(index)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button type="submit" color="primary" isDisabled={loading || isSubmitting}>
                  {mode === "edit" ? "Update" : "Save"}
                </Button>
                <Button variant="bordered" onPress={onCancel || (() => navigate(-1))}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </FormDateProvider>
  )
}

export default EquipmentMasterForm;
