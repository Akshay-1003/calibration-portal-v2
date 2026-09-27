"use client"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { FormField } from "../ui/form-field"
import { DatePicker, Select, SelectItem } from "@heroui-v2/react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useState } from "react"
import { useOrganizations } from "../../hooks/useOrganizations"
import { format } from "date-fns"
import { parseDate } from "@internationalized/date"
import { outwardFormSchema, type OutwardFormData } from "../../lib/validations"
import { useCreateOutwardEntryMutation } from "../../hooks/queries/outwards"
import { FormDateProvider } from "./FormDateProvider"

// API request type (dates as strings)
type OutwardApiRequest = Omit<OutwardFormData, 'outwardDate'> & {
  outwardDate: string;
}

const OutwardForm = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isSubmitSuccessful, setIsSubmitSuccessful] = useState(false)
  const { organizations, loading: orgLoading } = useOrganizations("customers")
  const createMutation = useCreateOutwardEntryMutation()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    control
  } = useForm<OutwardFormData>({
    resolver: zodResolver(outwardFormSchema),
    defaultValues: {
      clientOrgId: "",
      outwardDate: undefined,
      transportBy: "",
    },
    mode: "onChange"
  })

  // Convert form data to API format
  const convertToApiFormat = (data: OutwardFormData): OutwardApiRequest => ({
    ...data,
    outwardDate: data.outwardDate ? format(data.outwardDate, "yyyy-MM-dd") : "",
  })

  // Handle form submission
  const onSubmit = async (data: OutwardFormData) => {
    setIsSubmitSuccessful(false)

    try {
      const apiData = convertToApiFormat(data)

      // Map to API expected format
      const payload = {
        client_org_id: apiData.clientOrgId,
        outward_date: apiData.outwardDate,
        transport_by: apiData.transportBy,
      }

      await createMutation.mutateAsync(payload)

      // Set flag to prevent error messages from showing after successful submit
      setIsSubmitSuccessful(true)
      
      // Navigate with returnTo if available, otherwise to default list
      const returnTo = searchParams.get('returnTo') || '/transactions/outward'
      navigate(returnTo, { replace: true, state: { fromCreate: true } })

    } catch (apiError) {
      // Reset success flag on error so errors can be displayed
      setIsSubmitSuccessful(false)
      // Error is already handled by the mutation's onError
      console.error("API Error:", apiError)
    }
  }

  return (
    <FormDateProvider>
      <div className="max-w-6xl mx-auto space-y-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-secondary-900">Create Outward</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Row 1: Client Organization, Outward Date, Transport By - 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Client Organization */}
              <FormField
                label="Client Organization"
                required={true}
                error={!isSubmitSuccessful ? errors.clientOrgId?.message : undefined}
              >
                <Select
                  label=""
                  aria-label="Client Organization"
                  placeholder={orgLoading ? "Loading organizations..." : "Select Client Organization"}
                  isDisabled={orgLoading}
                  selectedKeys={watch('clientOrgId') ? [watch('clientOrgId')] : []}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] as string
                    setValue("clientOrgId", value, { shouldValidate: true })
                  }}
                  isInvalid={!isSubmitSuccessful && !!errors.clientOrgId}
                  className="w-full"
                  classNames={{
                    base: "w-full",
                    trigger: (!isSubmitSuccessful && errors.clientOrgId)
                      ? "border-destructive border-2" 
                      : "border border-input bg-background hover:bg-accent"
                  }}
                >
                  {organizations.map(org => (
                    <SelectItem key={org.id} textValue={org.name}>{org.name}</SelectItem>
                  ))}
                </Select>
              </FormField>

              {/* Outward Date */}
              <FormField
                label="Outward Date"
                required={true}
                error={!isSubmitSuccessful ? errors.outwardDate?.message : undefined}
              >
                <Controller
                  name="outwardDate"
                  control={control}
                  render={({ field: { onChange, value }, fieldState }) => (
                    <DatePicker
                      label=""
                      className="w-full"
                      isInvalid={fieldState.invalid}
                      classNames={{
                        base: "w-full",
                        inputWrapper: (!isSubmitSuccessful && fieldState.invalid)
                          ? "border-destructive border-2" 
                          : "border border-input bg-background hover:bg-accent"
                      }}
                      value={value ? parseDate(format(value as Date, "yyyy-MM-dd")) : null}
                      onChange={(date) => onChange(date ? new Date(date.toString()) : undefined)}
                    />
                  )}
                />
              </FormField>

              {/* Transport By */}
              <FormField
                label="Transport By"
                required={true}
                error={!isSubmitSuccessful ? errors.transportBy?.message : undefined}
              >
                <Input
                  placeholder="Enter transport by"
                  {...register('transportBy')}
                  className={(!isSubmitSuccessful && errors.transportBy) ? "border-destructive focus-visible:ring-destructive" : ""}
                />
              </FormField>
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-secondary-200">
              <Button
                type="submit"
                size="lg"
                loading={createMutation.isPending || isSubmitting}
                disabled={createMutation.isPending || isSubmitting}
                className="w-full md:w-auto"
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                }
              >
                Create Outward
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => {
                  const returnTo = searchParams.get('returnTo')
                  if (returnTo) {
                    navigate(returnTo)
                  } else {
                    navigate(-1)
                  }
                }}
                disabled={createMutation.isPending || isSubmitting}
                className="w-full md:w-auto"
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                }
              >
                Back
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
    </FormDateProvider>
  )
}

export default OutwardForm
