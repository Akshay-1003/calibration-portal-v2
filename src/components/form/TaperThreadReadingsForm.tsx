"use client"

import { useForm, Controller } from "react-hook-form"
import {
  Input,
  Button,
  Card,
  CardHeader,
  CardBody,
  Select,
  SelectItem,
} from "@heroui-v2/react"; import { useNavigate } from "react-router-dom"
import { useEffect } from "react"
import { toast } from "sonner"
import { 
    transformFormDataToApiFormat, 
    transformApiResponseToFormData,
    type TaperThreadReadingsFormData as StoreFormData
} from "../../store/taperThreadReadingsStore"
import { cn } from "../../lib/utils"
import { taperThreadReadingsFormSchema, zodResolver, type TaperThreadReadingsFormData } from "../../lib/validations"
import { FormField } from "../ui/form-field"
import { useTaperThreadReading } from "../../hooks/useTaperThreadReading"
import { useQueryClient } from "@tanstack/react-query"
import { createTaperThreadReading, updateTaperThreadReading } from "../../services/apiServices"

interface TaperThreadReadingsFormProps {
  mode?: 'create' | 'edit';
  standard_specification?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const TaperThreadReadingsForm = ({ mode = 'create', standard_specification, onSuccess, onCancel }: TaperThreadReadingsFormProps) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  // Use hook to fetch data in edit mode
  const { data, loading: initialLoading } = useTaperThreadReading(mode === 'edit' ? standard_specification : undefined)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    control
  } = useForm<TaperThreadReadingsFormData>({
    resolver: zodResolver(taperThreadReadingsFormSchema),
    defaultValues: {
      gauge_type: "",
      gauge_sub_type: "",
      standard_specification: "",
      pitch_dial_max: "",
      pitch_dial_min: "",
      max_step: "",
      basic_step: "",
      min_step: "",
      total_length: "",
    },
    mode: "onChange"
  })

  // Load existing data in edit mode
  useEffect(() => {
    if (!data) return;

    // Transform nested API response to flat form data
    const formData = transformApiResponseToFormData(data);
    
    // Set form values
    reset(formData);
  }, [data, reset]);

  const onSubmit = async (formData: TaperThreadReadingsFormData) => {
    try {
      // Transform flat form data to nested API format
      const apiData = transformFormDataToApiFormat(formData as StoreFormData)
      
      if (mode === 'edit' && standard_specification) {
        await updateTaperThreadReading(standard_specification, apiData)
        toast.success("Taper Thread Reading updated successfully!")
      } else {
        await createTaperThreadReading(apiData)
        toast.success("Taper Thread Reading created successfully!")
      }

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({
        queryKey: ["taper-thread-readings"],
      });

      if (onSuccess) {
        onSuccess()
      } else {
        // Navigate back
        navigate(-1)
      }
    } catch (error) {
      console.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} taper thread reading:`, error)
      toast.error(`Failed to ${mode === 'edit' ? 'update' : 'create'} taper thread reading`)
    }
  }

  if (initialLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card className="shadow-lg border-0 bg-card">
          < CardBody className="p-8">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-muted-foreground">Loading data...</span>
            </div>
          </ CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Card className="shadow-md border bg-card rounded-xl overflow-hidden">
        <CardHeader className="bg-blue-600 text-white px-6 py-4 rounded-t-xl">
          <h1 className="text-xl font-semibold text-white tracking-tight">
            {mode === 'edit' ? 'Edit Taper Thread Reading' : 'Taper Thread Reading'}
          </h1>
        </CardHeader>
        < CardBody className="p-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Type and Standard Specification */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-5">
              <FormField
                label="Type"
                required={true}
                error={errors.gauge_type?.message}
              >
                <Controller
                  name="gauge_type"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Select
                      label=""
                      placeholder="Select type"
                      selectedKeys={value ? [value] : []}
                      onSelectionChange={(keys) => {
                        const selectedValue = Array.from(keys)[0] as string;
                        onChange(selectedValue);
                      }}
                      className="w-full"
                      classNames={{
                        trigger: "border border-input bg-background hover:bg-accent min-h-[40px]",
                        value: "text-foreground/80"
                      }}
                    >
                      <SelectItem key="Plug">Plug</SelectItem>
                      <SelectItem key="Ring">Ring</SelectItem>
                    </Select>
                  )}
                />
              </FormField>

              <FormField
                label="Sub Type"
                required={false}
                error={errors.gauge_sub_type?.message}
              >
                <Controller
                  name="gauge_sub_type"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Select
                      label=""
                      placeholder="Select gauge sub type"
                      selectedKeys={value ? [value] : []}
                      onSelectionChange={(keys) => {
                        const selectedValue = Array.from(keys)[0] as string;
                        onChange(selectedValue);
                      }}
                      className="w-full"
                      classNames={{
                        trigger: "border border-input bg-background hover:bg-accent min-h-[40px]",
                        value: "text-foreground/80"
                      }}
                    >
                      <SelectItem key="Gauge Plane">Gauge Plane</SelectItem>
                      <SelectItem key="Other">Other</SelectItem>
                    </Select>
                  )}
                />
              </FormField>

              <FormField
                label="Standard Specification"
                required={false}
                error={errors.standard_specification?.message}
              >
                <Input
                  placeholder="Enter standard specification"
                  className={cn(
                    "h-10",
                    errors.standard_specification && "border-destructive"
                  )}
                  {...register("standard_specification")}
                />
              </FormField>
            </div>

            {/* Parameter Table Section */}
            <div className="space-y-3 pt-3">
              <h3 className="text-sm font-medium text-foreground/80">Specification Parameters</h3>

              <div className="border rounded-md overflow-hidden">
                {/* Table Header */}
                <div className="bg-gray-700 text-white">
                  <div className="grid grid-cols-3 text-center text-xs font-medium">
                    <div className="p-2.5 border-r border-gray-600">PARAMETER (MM)</div>
                    <div className="p-2.5 border-r border-gray-600">SPECIFIED LIMIT MAX (MM)</div>
                    <div className="p-2.5">SPECIFIED LIMIT MIN (MM)</div>
                  </div>
                </div>

                {/* Pitch Dial Row */}
                <div className="grid grid-cols-3 border-b">
                  <div className="p-2.5 border-r flex items-center text-sm font-medium text-foreground/70 bg-muted/30">PITCH DIAL</div>
                  <div className="p-2 border-r bg-background">
                    <Input
                      placeholder=""
                      type="number"
                      step="0.001"
                      className="h-9 text-sm"
                      {...register("pitch_dial_max")}
                    />
                  </div>
                  <div className="p-2 bg-background">
                    <Input
                      placeholder=""
                      type="number"
                      step="0.001"
                      className="h-9 text-sm"
                      {...register("pitch_dial_min")}
                    />
                  </div>
                </div>

                {/* Max Step Row */}
                <div className="grid grid-cols-3 border-b">
                  <div className="p-2.5 border-r flex items-center text-sm font-medium text-foreground/70 bg-muted/30">MAX STEP</div>
                  <div className="p-2 border-r bg-background">
                    <Input
                      placeholder=""
                      type="number"
                      step="0.001"
                      className="h-9 text-sm"
                      {...register("max_step")}
                    />
                  </div>
                  <div className="p-2 bg-background">
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                      -
                    </div>
                  </div>
                </div>

                {/* Basic Step Row */}
                <div className="grid grid-cols-3 border-b">
                  <div className="p-2.5 border-r flex items-center text-sm font-medium text-foreground/70 bg-muted/30">BASIC STEP</div>
                  <div className="p-2 border-r bg-background">
                    <Input
                      placeholder=""
                      type="number"
                      step="0.001"
                      className="h-9 text-sm"
                      {...register("basic_step")}
                    />
                  </div>
                  <div className="p-2 bg-background">
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                      -
                    </div>
                  </div>
                </div>

                {/* Min Step Row */}
                <div className="grid grid-cols-3 border-b">
                  <div className="p-2.5 border-r flex items-center text-sm font-medium text-foreground/70 bg-muted/30">MIN STEP</div>
                  <div className="p-2 border-r bg-background">
                    <Input
                      placeholder=""
                      type="number"
                      step="0.001"
                      className="h-9 text-sm"
                      {...register("min_step")}
                    />
                  </div>
                  <div className="p-2 bg-background">
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                      -
                    </div>
                  </div>
                </div>

                {/* Total Length Row */}
                <div className="grid grid-cols-3">
                  <div className="p-2.5 border-r flex items-center text-sm font-medium text-foreground/70 bg-muted/30">TOTAL LENGTH</div>
                  <div className="col-span-2 p-2 border-r bg-background text-center">
                    <div className="flex items-center justify-center">
                      <Input
                        placeholder=""
                        type="number"
                        step="0.001"
                        className="h-9 text-sm w-full max-w-[160px]"
                        {...register("total_length")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting
                  ? (mode === 'edit' ? 'Updating...' : 'Saving...')
                  : 'Save'}
              </Button>
              <Button
                type="button"
                variant="flat"
                onPress={onCancel || (() => navigate(-1))}
                disabled={isSubmitting}
              >
                Close
              </Button>
            </div>
          </form>
        </ CardBody>
      </Card>
    </div>
  )
}

export default TaperThreadReadingsForm;

