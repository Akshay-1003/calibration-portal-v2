"use client"

import type { InputHTMLAttributes } from "react"
import { useForm, Controller } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { ApiError } from "../../services/api"
import { toast } from "sonner"
import { Trash2, Plus } from "lucide-react"
import { EquipmentHistoryRange } from "../../store/equipmentHistoryStore"
import { useEquipmentsWithQuery } from "../../hooks/useEquipmentsWithQuery"
import { useEquipmentHistoryStore } from "../../store/equipmentHistoryStore"
import { Autocomplete, Button, Calendar, DateField, DatePicker, Input, ListBox } from "@heroui/react"
import { parseDate, type DateValue } from "@internationalized/date"
import { equipmentHistorySchema, zodResolver, type EquipmentHistoryFormData } from "../../lib/validations"
import { FormDateProvider } from "./FormDateProvider"

// Helper function to extract date part from ISO string
const extractDatePart = (dateString: string | null | undefined): string | null => {
  if (!dateString) return null;
  // Extract YYYY-MM-DD from ISO string (e.g., "2025-04-06T00:00:00" -> "2025-04-06")
  const match = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

const FieldInput = ({ label, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) => (
  <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
    {label}
    <Input {...props} className={`w-full ${props.className ?? ''}`} aria-invalid={Boolean(error)} />
    {error ? <span className="font-normal text-red-600">{error}</span> : null}
  </label>
)

const FormDatePicker = ({ label, value, onChange, error }: { label: string; value: DateValue | null; onChange: (value: DateValue | null) => void; error?: string }) => (
  <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
    {label}
    <DatePicker className="w-full" value={value} onChange={onChange} aria-label={label} granularity="day">
      <DateField.Group fullWidth>
        <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateField.Suffix><DatePicker.Trigger><DatePicker.TriggerIndicator /></DatePicker.Trigger></DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover>
        <Calendar aria-label={label}>
          <Calendar.Header><Calendar.YearPickerTrigger><Calendar.YearPickerTriggerHeading /><Calendar.YearPickerTriggerIndicator /></Calendar.YearPickerTrigger><Calendar.NavButton slot="previous" /><Calendar.NavButton slot="next" /></Calendar.Header>
          <Calendar.Grid><Calendar.GridHeader>{(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}</Calendar.GridHeader><Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody></Calendar.Grid>
          <Calendar.YearPickerGrid><Calendar.YearPickerGridBody>{({ year }) => <Calendar.YearPickerCell year={year} />}</Calendar.YearPickerGridBody></Calendar.YearPickerGrid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
    {error ? <span className="font-normal text-red-600">{error}</span> : null}
  </label>
)


interface EquipmentHistoryFormProps {
  mode?: 'create' | 'edit';
  historyId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const EquipmentHistoryForm = ({ mode = 'create', historyId, onSuccess, onCancel }: EquipmentHistoryFormProps) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(mode === 'edit')
  const [ranges, setRanges] = useState<EquipmentHistoryRange[]>([])
  const [newRange, setNewRange] = useState({ range: '', max_permissible_error: '', uncertainty: '' })

  const { equipments } = useEquipmentsWithQuery()

 
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
    control
  } = useForm<EquipmentHistoryFormData>({
     resolver: zodResolver(equipmentHistorySchema),
    defaultValues: {
      master_equipment_id: "",
      cal_by: "",
      cal_date: "",
      remark: "",
      calibration_due_date: "",
      format_no: "",
      cal_certificate_no: "",
      traceability: "",
      ranges: []
    },
    mode: "onChange"
  })

  const selectedEquipmentId = watch("master_equipment_id")

  const {
    getEquipmentHistoryById,
    fetchEquipmentHistories,
    createEquipmentHistory,
    updateEquipmentHistory
  } = useEquipmentHistoryStore()

  useEffect(() => {
    const hydrateFromStore = async () => {
      if (mode === 'edit' && historyId) {
        setInitialLoading(true)
        const existing = getEquipmentHistoryById(historyId)
        if (!existing) {
          try {
            await fetchEquipmentHistories()
          } catch {}
        }
        const history = existing || getEquipmentHistoryById(historyId)
        if (history) {
          setValue('master_equipment_id', history.master_equipment_id || '')
          setValue('cal_by', history.cal_by || '')
          // Extract date part from ISO string
          const calDate = history.cal_date ? extractDatePart(history.cal_date.toString()) : ''
          setValue('cal_date', calDate || '')
          const dueDate = history.calibration_due_date ? extractDatePart(history.calibration_due_date.toString()) : ''
          setValue('calibration_due_date', dueDate || '')
          setValue('remark', history.remark || '')
          setValue('format_no', history.format_no || '')
          setValue('cal_certificate_no', history.cal_certificate_no || '')
          setValue('traceability', history.traceability || '')
          setRanges(history.ranges || [])
        }
        setInitialLoading(false)
      }
    }
    hydrateFromStore()
  }, [mode, historyId, getEquipmentHistoryById, fetchEquipmentHistories, setValue])

  const onSubmit = async (data: EquipmentHistoryFormData) => {
    setLoading(true)
    try {
      const historyData = {
        ...data,
        ranges: [...ranges],
      }

      if (mode === 'edit' && historyId) {
        await updateEquipmentHistory(historyId, historyData as any)
        toast.success("Equipment History updated successfully!")
      } else {
        await createEquipmentHistory(historyData as any)
        toast.success("Equipment History created successfully!")
      }

      reset()
      setRanges([])
      setNewRange({ range: '', max_permissible_error: '', uncertainty: '' })

      if (onSuccess) {
        onSuccess()
      } else {
        navigate("/masters/equipment-history", {
          state: { [mode === 'edit' ? 'fromEdit' : 'fromCreate']: true },
          replace: true
        })
      }
    } catch (error) {
      console.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} equipment history:`, error)
      const errorMessage = error instanceof ApiError ? error.message : `Failed to ${mode === 'edit' ? 'update' : 'create'} equipment history`
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRange = () => {
    if (newRange.range.trim() && newRange.max_permissible_error.trim() && newRange.uncertainty.trim()) {
      setRanges(prev => [...prev, newRange])
      setNewRange({ range: '', max_permissible_error: '', uncertainty: '' })
      toast.success('Range added successfully')
    } else {
      toast.error('Please fill all range fields')
    }
  }

  const handleRemoveRange = (index: number) => {
    setRanges(prev => prev.filter((_, i) => i !== index))
    toast.success('Range removed')
  }

  if (initialLoading) {
    return (
      <div className="w-full mx-auto">
        <div className="shadow-sm border rounded-md bg-card">
          <div className="bg-blue-600 text-white px-4 py-3 rounded-t-md text-xl font-semibold">
            {mode === 'edit' ? 'Edit Equipment History' : 'Equipment History Form'}
          </div>
          <div className="p-8">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-muted-foreground">Loading equipment history data...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <FormDateProvider>
      <div className="w-full mx-auto">
     
        <div className="shadow-sm border rounded-md bg-card">
          <div className="bg-blue-600 text-white px-4 py-3 rounded-t-md text-xl font-semibold">
            {mode === 'edit' ? 'Edit Equipment History' : 'Equipment History Form'}
          </div>
        <div className="p-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Equipment History Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Master Equipment Name - Full Width */}
              <div className="md:col-span-2">
                <Autocomplete className="w-full" selectedKey={selectedEquipmentId || null} onSelectionChange={(key) => setValue("master_equipment_id", key as string)}>
                  <Autocomplete.Trigger>
                    <Autocomplete.Filter><Input placeholder="Search and select an equipment" /></Autocomplete.Filter>
                    <Autocomplete.Indicator />
                  </Autocomplete.Trigger>
                  <Autocomplete.Popover>
                    <ListBox>
                  {equipments.map((equipment) => (
                    <ListBox.Item
                      id={equipment.id}
                      textValue={`${equipment.equipment_name} (${equipment.code_no})`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{equipment.equipment_name}</span>
                        <span className="text-xs text-muted-foreground">{equipment.code_no}</span>
                      </div>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                    </ListBox>
                  </Autocomplete.Popover>
                </Autocomplete>
                {errors.master_equipment_id?.message ? <span className="text-sm font-normal text-red-600">{errors.master_equipment_id.message}</span> : null}
              </div>

              {/* Cal. by */}
              <FieldInput
                label="Cal. by"
                placeholder="Enter calibrated by"
                {...register("cal_by", {
                  required: "Cal. by is required",
                  minLength: { value: 2, message: "Cal. by must be at least 2 characters" }
                })}
                error={errors.cal_by?.message}
              />

              {/* Calibration Date */}
              <Controller
                name="cal_date"
                control={control}
                render={({ field: { onChange, value } }) => {
                  const dateValue = value ? extractDatePart(value) : null;
                  return (
                    <FormDatePicker label="Calibration Date" value={dateValue ? parseDate(dateValue) : null} onChange={(date) => onChange(date ? String(date) : "")} error={errors.cal_date?.message} />
                  );
                }}
              />

              {/* Remark */}
              <FieldInput
                label="Remark"
                placeholder="Enter remark"
                {...register("remark")}
                error={errors.remark?.message}
              />

              {/* Calibration Due Date */}
              <Controller
                name="calibration_due_date"
                control={control}
                render={({ field: { onChange, value } }) => {
                  const dateValue = value ? extractDatePart(value) : null;
                  return (
                    <FormDatePicker label="Calibration Due Date" value={dateValue ? parseDate(dateValue) : null} onChange={(date) => onChange(date ? String(date) : "")} error={errors.calibration_due_date?.message} />
                  );
                }}
              />

              {/* Format No. */}
              <FieldInput
                label="Format No."
                placeholder="Enter format number"
                {...register("format_no")}
                error={errors.format_no?.message}
              />

              {/* Cal. Certificate no */}
              <FieldInput
                label="Cal. Certificate no"
                placeholder="Enter calibration certificate number"
                {...register("cal_certificate_no")}
                error={errors.cal_certificate_no?.message}
              />

              {/* Traceability */}
              <FieldInput
                label="Traceability"
                placeholder="Enter traceability"
                {...register("traceability")}
                error={errors.traceability?.message}
              />
            </div>

            {/* Ranges Section */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Calibration Ranges</h3>
                <Button
                  type="button"
                  onPress={handleAddRange}
                  isDisabled={!newRange.range.trim() || !newRange.max_permissible_error.trim() || !newRange.uncertainty.trim()}
                  variant="primary"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Range
                </Button>
              </div>

              {/* Add New Range */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-md">
                <FieldInput
                  label="Range"
                  value={newRange.range}
                  onChange={(e) => setNewRange({ ...newRange, range: e.target.value })}
                  placeholder="Enter range (e.g., 0-50 mm)"
                />

                <FieldInput
                  label="MAX Permissible Error"
                  value={newRange.max_permissible_error}
                  onChange={(e) => setNewRange({ ...newRange, max_permissible_error: e.target.value })}
                  placeholder="Enter max error (e.g., ±0.02 mm)"
                />

                <FieldInput
                  label="Uncertainty"
                  value={newRange.uncertainty}
                  onChange={(e) => setNewRange({ ...newRange, uncertainty: e.target.value })}
                  placeholder="Enter uncertainty"
                />
              </div>

              {/* Existing Ranges */}
              {ranges.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Current Ranges ({ranges.length})</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-3 bg-card">
                    {ranges.map((range, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-md border"
                      >
                        <div className="flex-1 grid grid-cols-3 gap-4">
                          <div className="text-sm">
                            <span className="font-medium text-muted-foreground">Range: </span>
                            <span className="text-primary">{range.range}</span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-muted-foreground">Max Error: </span>
                            <span className="text-primary">{range.max_permissible_error}</span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-muted-foreground">Uncertainty: </span>
                            <span className="text-primary">{range.uncertainty}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onPress={() => handleRemoveRange(index)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 ml-2"
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
              <Button type="submit" variant="primary" isDisabled={loading || isSubmitting}>
                {loading || isSubmitting ? "Saving..." : mode === "edit" ? "Update" : "Save"}
              </Button>
              <Button variant="outline" onPress={onCancel || (() => navigate(-1))}>
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

export default EquipmentHistoryForm;
