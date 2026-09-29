"use client"

import { useForm } from "react-hook-form"
import { Button, Input, Label, ListBox, Select } from "@heroui/react"
import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { ApiError, apiClient } from "../../services/api"
import { toast } from "sonner"
import { useCertificateTypeStore } from "../../store/certificateTypeStore"
import { useMasterDataStore } from "../../store/useStore"
import { gaugeMasterSchema, zodResolver, type GaugeMasterFormData } from "../../lib/validations"

interface GaugesMasterFormProps {
  mode?: 'create' | 'edit';
  gaugeId?: string;
  initialData?: any; // Gauge data from store
  onSuccess?: (response?: any, mode?: 'create' | 'edit') => Promise<void> | void;
  onCancel?: () => void;
}

const GaugesMasterForm = ({ mode = 'create', gaugeId, initialData, onSuccess, onCancel }: GaugesMasterFormProps) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  
  // Use certificate type store
  const { 
    certificateTypes, 
    fetchAllCertificateTypes
  } = useCertificateTypeStore()
  
  // Use gauge store for state management
  const { updateGauge, fetchGaugeMasters } = useMasterDataStore()
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset
  } = useForm<GaugeMasterFormData>({
    resolver: zodResolver(gaugeMasterSchema),
    defaultValues: {
      name: "",
      is_standard_no: "",
      non_nabl_cert_frmt_no: "",
      nabl_cert_frmt_no: "",
      raw_datasheet_frmt_no: "",
      certificate_code: "",
      calibration_method: "",
      environmental_conditions: "",
      certificate_type_id: "",
    },
    mode: "onChange"
  })

  // Load certificate types when component mounts
  useEffect(() => {
    fetchAllCertificateTypes()
  }, [fetchAllCertificateTypes])

  // Load existing data in edit mode
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      console.log('Using gauge data from store (no API call)');
      // Set form values from initialData
      Object.keys(initialData).forEach((key) => {
        if (key !== 'id' && key !== 'created_at' && key !== 'updated_at' && key !== 'deleted_at' && key !== 'archived' && key !== 'certificate_type_name') {
          setValue(key as keyof GaugeMasterFormData, initialData[key] || '')
        }
      })
    }
  }, [mode, initialData, setValue])

  const onSubmit = async (data: GaugeMasterFormData) => {
    setLoading(true)
    try {
      let response
      if (mode === 'edit' && gaugeId) {
        // Use store action for update to ensure state synchronization
        await updateGauge(gaugeId, data)
        // Refresh gauge masters to ensure table is updated
        await fetchGaugeMasters(true)
        toast.success("Gauge Master updated successfully!")
        response = { id: gaugeId, ...data }
      } else {
        // For create, still use API directly but refresh store
        response = await apiClient.postApiResponse("/gauge/master", data)
        const responsePayload = (response as any)?.data ?? response;
        // Refresh gauge masters to ensure table is updated
        await fetchGaugeMasters(true)
        toast.success("Gauge Master created successfully!")
        response = responsePayload
      }
      
      if (response) {
        reset()
        
        // Call success callback
        if (onSuccess) {
          await onSuccess(response, mode)
        } else {
          // Navigate back - no need for state since store is already updated
          navigate("/masters/gauges-master", { replace: true })
        }
      }
    } catch (error) {
      console.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} gauge master:`, error)
      const errorMessage = error instanceof ApiError ? error.message : `Failed to ${mode === 'edit' ? 'update' : 'create'} gauge master`
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }



  const formFields = [
    { key: 'name', label: 'Gauge Name', placeholder: 'Enter gauge name', required: true, minLength: 2 },
    { key: 'is_standard_no', label: 'IS Standard Number', placeholder: 'Enter IS standard number', required: true, minLength: 2 },
    { key: 'certificate_code', label: 'Certificate Code', placeholder: 'Enter certificate code', required: false, minLength: 0 },
    { key: 'non_nabl_cert_frmt_no', label: 'Non-NABL Certificate Format No', placeholder: 'Enter non-NABL certificate format number', required: false, minLength: 0 },
    { key: 'nabl_cert_frmt_no', label: 'NABL Certificate Format No', placeholder: 'Enter NABL certificate format number', required: false, minLength: 0 },
    { key: 'raw_datasheet_frmt_no', label: 'Raw Datasheet Format No', placeholder: 'Enter raw datasheet format number', required: false, minLength: 0 },
    { key: 'calibration_method', label: 'Calibration Method', placeholder: 'Enter calibration method', required: false, minLength: 0 },
    { key: 'environmental_conditions', label: 'Environmental Conditions', placeholder: 'Enter environmental conditions', required: false, minLength: 0 },
  ]

  return (
    <div className="w-full">
      <div className="shadow-sm border rounded-md bg-card">
        <div className="bg-blue-600 text-white px-4 py-3 rounded-t-md text-xl font-semibold">
          {mode === "edit" ? "Edit Gauge Master" : "New Gauge Master"}
        </div>

        <div className="p-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formFields.map((field) => (
                <label key={field.key} className="flex flex-col gap-2 text-sm font-medium text-foreground">
                  {field.label}
                  <Input
                    className="w-full"
                    placeholder={field.placeholder}
                    {...register(field.key as keyof GaugeMasterFormData)}
                    aria-invalid={!!errors[field.key as keyof GaugeMasterFormData]}
                  />
                  {errors[field.key as keyof GaugeMasterFormData]?.message ? (
                    <span className="font-normal text-red-600">{errors[field.key as keyof GaugeMasterFormData]?.message}</span>
                  ) : null}
                </label>
              ))}

              {/* Certificate Type */}
              <Select className="w-full"
                selectedKey={watch('certificate_type_id') || null}
                placeholder="Select Certificate Type"
                onSelectionChange={(key) => {
                  const value = key as string
                  setValue('certificate_type_id', value, { shouldValidate: true })
                }}
              >
                <Label>Certificate Type</Label>
                <Select.Trigger className="w-full"><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                {certificateTypes.map(certType => (
                  <ListBox.Item key={certType.id} id={certType.id} textValue={certType.name}>
                    {certType.name}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
                  </ListBox>
                </Select.Popover>
              </Select>
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
  )
}

export default GaugesMasterForm
