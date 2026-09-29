"use client"

import { useForm, Controller } from "react-hook-form"

import {
  Input,
  Button,
  Card,
  ListBox,
  Select,
} from "@heroui/react";
import { useNavigate } from "react-router-dom"
import { useEffect } from "react"
import { toast } from "sonner"
import {
  transformFormDataToApiFormat,
  transformApiResponseToFormData,
  type ThreadRingPlugFormData as StoreFormData
} from "../../store/threadRingPlugStore"
import { cn } from "../../lib/utils"
import { threadRingPlugFormSchema, zodResolver, type ThreadRingPlugFormData } from "../../lib/validations"
import { FormField } from "../ui/form-field"
import { useThreadRingPlug } from "../../hooks/useThreadRingPlug"
import { useQueryClient } from "@tanstack/react-query"
import { createThreadRingPlug, updateThreadRingPlug } from "../../services/apiServices"
import { queryKeys } from "../../hooks/queries/queryKeys"
interface ThreadRingPlugFormProps {
  mode?: 'create' | 'edit';
  standard_specification?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ThreadRingPlugForm = ({ mode = 'create', standard_specification, onSuccess, onCancel }: ThreadRingPlugFormProps) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Use hook to fetch data in edit mode (similar to useDialTable)
  const { data, loading: initialLoading } = useThreadRingPlug(mode === 'edit' ? standard_specification : undefined)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    control
  } = useForm<ThreadRingPlugFormData>({
    resolver: zodResolver(threadRingPlugFormSchema),
    defaultValues: {
      gauge_type: "",
      standard_specification: "",
      go_max_wear_limit: "",
      go_min_wear_limit: "",
      go_wear_limit: "",
      no_go_max_wear_limit: "",
      no_go_min_wear_limit: "",
      no_go_wear_limit: "",
    },
    mode: "onChange"
  })

  // Load existing data in edit mode (similar to DialTableMaster)
  useEffect(() => {
    if (!data) return;

    // Transform nested API response to flat form data
    const formData = transformApiResponseToFormData(data);

    // Set form values
    reset(formData);
  }, [data, reset]);

  const onSubmit = async (formData: ThreadRingPlugFormData) => {
    try {
      // Transform flat form data to nested API format
      const apiData = transformFormDataToApiFormat(formData as StoreFormData)

      if (mode === 'edit' && standard_specification) {
        await updateThreadRingPlug(standard_specification, apiData)
        toast.success("Thread Ring/Plug Master updated successfully!")
      } else {
        await createThreadRingPlug(apiData)
        toast.success("Thread Ring/Plug Master created successfully!")
      }

      // Invalidate queries to refresh the list (similar to DialTableMaster)
      queryClient.invalidateQueries({
        queryKey: queryKeys.threadRingPlugs.all,
      });

      if (onSuccess) {
        onSuccess()
      } else {
        // Navigate back (similar to DialTableMaster)
        navigate(-1)
      }
    } catch (error) {
      console.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} thread ring/plug:`, error)
      toast.error(`Failed to ${mode === 'edit' ? 'update' : 'create'} thread ring/plug`)
    }
  }



  if (initialLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card className="shadow-sm border-0 bg-card">
          <Card.Content className="p-8">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-muted-foreground">Loading data...</span>
            </div>
          </Card.Content>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Card className="shadow-sm border border-gray-200">
        <Card.Header className="pb-4 border-b border-gray-200 bg-blue-600 text-white">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-semibold text-white">
                {mode === 'edit' ? 'Edit Thread Ring/Plug Master' : 'Thread Ring/Plug Master Information'}
              </h1>

            </div>
          </div>
        </Card.Header>
        <Card.Content className="p-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Gauge Type and Standard Specification */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
              <FormField
                label="Gauge Type"
                required={true}
                error={errors.gauge_type?.message}
              >
                <Controller
                  name="gauge_type"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Select
                      placeholder="Select gauge type"
                      selectedKey={value || null}
                      onSelectionChange={(key) => {
                        const selectedValue = key as string;
                        onChange(selectedValue);
                      }}
                      className="w-full"
                    >
                      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="thread_ring_gauge" textValue="Ring">Ring<ListBox.ItemIndicator /></ListBox.Item>
                          <ListBox.Item id="thread_plug_gauge" textValue="Plug">Plug<ListBox.ItemIndicator /></ListBox.Item>
                        </ListBox>
                      </Select.Popover>
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
                    "h-10 w-full",
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
                  <div className="grid grid-cols-4 text-center text-xs font-medium">
                    <div className="p-2.5 border-r border-gray-600">PARAMETER (MM)</div>
                    <div className="p-2.5 border-r border-gray-600">MAX WEAR LIMIT (MM)</div>
                    <div className="p-2.5 border-r border-gray-600">MIN WEAR LIMIT (MM)</div>
                    <div className="p-2.5">WEAR LIMIT (MM)</div>
                  </div>
                </div>

                {/* Go Row */}
                <div className="grid grid-cols-4 border-b">
                  <div className="p-2.5 border-r flex items-center text-sm font-medium text-foreground/70 bg-muted/30">Go</div>
                  <div className="p-2 border-r bg-background">
                    <Input
                      placeholder=""
                      type="number"
                      step="0.001"
                      className="h-9 w-full text-sm"
                      {...register("go_max_wear_limit")}
                    />
                  </div>
                  <div className="p-2 border-r bg-background">
                    <Input
                      placeholder=""
                      type="number"
                      step="0.001"
                      className="h-9 w-full text-sm"
                      {...register("go_min_wear_limit")}
                    />
                  </div>
                  <div className="p-2 bg-background">
                    <Input
                      placeholder=""
                      type="number"
                      step="0.001"
                      className="h-9 w-full text-sm"
                      {...register("go_wear_limit")}
                    />
                  </div>
                </div>

                {/* No Go Row */}
                <div className="grid grid-cols-4">
                  <div className="p-2.5 border-r flex items-center text-sm font-medium text-foreground/70 bg-muted/30">No Go</div>
                  <div className="p-2 border-r bg-background">
                    <Input
                      placeholder=""
                      type="number"
                      step="0.001"
                      className="h-9 w-full text-sm"
                      {...register("no_go_max_wear_limit")}
                    />
                  </div>
                  <div className="p-2 border-r bg-background">
                    <Input
                      placeholder=""
                      type="number"
                      step="0.001"
                      className="h-9 w-full text-sm"
                      {...register("no_go_min_wear_limit")}
                    />
                  </div>
                  <div className="p-2 bg-background">
                    <Input
                      placeholder=""
                      type="number"
                      step="0.001"
                      className="h-9 w-full text-sm"
                      {...register("no_go_wear_limit")}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              <Button
                type="submit"
                variant="primary"
                isDisabled={isSubmitting}
               
              >
                {isSubmitting
                  ? (mode === 'edit' ? 'Updating...' : 'Creating...')
                  : (mode === 'edit' ? 'Update' : 'Save')}
              </Button>
              <Button
                type="button"
                variant="secondary"

                onPress={onCancel || (() => navigate(-1))}
                isDisabled={isSubmitting}
                
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>
    </div>
  )
}

export default ThreadRingPlugForm;
