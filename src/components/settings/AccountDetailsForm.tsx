import React from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Input,
  Label,
  ListBox,
  Select,
  Switch,
  TextArea,
} from '@heroui/react';
import {
  accountDetailFormSchema,
  accountDetailTypes,
  type AccountDetailFormData,
} from '../../lib/validations/accountDetailsSchemas';
import type { AccountDetail } from '../../types/accountDetails';

interface AccountDetailsFormProps {
  initialData?: AccountDetail | null;
  onSubmit: (data: AccountDetailFormData) => void | Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

const toDefaultValues = (initialData?: AccountDetail | null): AccountDetailFormData => ({
  firm_name: initialData?.firm_name || '',
  type:
    (initialData?.type as AccountDetailFormData['type']) || 'Calibration Lab',
  gst_no: initialData?.gst_no || '',
  pan_no: initialData?.pan_no || '',
  address: initialData?.address || '',
  contact_no: initialData?.contact_no || '',
  email: initialData?.email || '',
  website: initialData?.website || '',
  logo: initialData?.logo || '',
  bank_details: {
    bank_name: initialData?.bank_details?.bank_name || '',
    account_no: initialData?.bank_details?.account_no || '',
    ifsc: initialData?.bank_details?.ifsc || '',
    branch: initialData?.bank_details?.branch || '',
  },
  is_active: initialData?.is_active ?? true,
});

const FieldInput = ({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) => (
  <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
    {label}
    <Input {...props} className={`w-full ${props.className ?? ''}`} aria-invalid={Boolean(error)} />
    {error ? <span className="font-normal text-red-600">{error}</span> : null}
  </label>
);

const FieldTextArea = ({
  label,
  error,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }) => (
  <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
    {label}
    <TextArea {...props} className={`w-full ${props.className ?? ''}`} rows={3} aria-invalid={Boolean(error)} />
    {error ? <span className="font-normal text-red-600">{error}</span> : null}
  </label>
);

export const AccountDetailsForm: React.FC<AccountDetailsFormProps> = ({
  initialData,
  onSubmit,
  onClose,
  isLoading = false,
}) => {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof accountDetailFormSchema>, unknown, z.output<typeof accountDetailFormSchema>>({
    resolver: zodResolver(accountDetailFormSchema),
    mode: 'onChange',
    defaultValues: toDefaultValues(initialData),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FieldInput
          {...register('firm_name')}
          label="Firm Name"
          placeholder="Enter firm name"
          error={errors.firm_name?.message}
        />

        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select
              className="w-full"
              selectedKey={field.value}
              placeholder="Select firm type"
              onSelectionChange={(key) => {
                const selected = key as AccountDetailFormData['type'] | undefined;
                field.onChange(selected ?? 'Calibration Lab');
              }}
            >
              <Label>Type</Label>
              <Select.Trigger className="w-full"><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover>
                <ListBox>
              {accountDetailTypes.map((type) => (
                <ListBox.Item key={type} id={type} textValue={type}>
                  {type}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
                </ListBox>
              </Select.Popover>
            </Select>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FieldInput
          {...register('gst_no')}
          label="GST No"
          placeholder="Enter GST number"
          error={errors.gst_no?.message}
        />
        <FieldInput
          {...register('pan_no')}
          label="PAN No"
          placeholder="Enter PAN number"
          error={errors.pan_no?.message}
        />
      </div>

      <FieldTextArea
        {...register('address')}
        label="Address"
        placeholder="Enter firm address"
        error={errors.address?.message}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FieldInput
          {...register('contact_no')}
          label="Contact No"
          placeholder="Enter contact number"
          error={errors.contact_no?.message}
        />
        <FieldInput
          {...register('email')}
          label="Email"
          placeholder="Enter email address"
          error={errors.email?.message}
        />
        <FieldInput
          {...register('website')}
          label="Website"
          placeholder="Enter website"
          error={errors.website?.message}
        />
        <FieldInput
          {...register('logo')}
          label="Logo URL"
          placeholder="Enter logo url"
          error={errors.logo?.message}
        />
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50/60 p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Bank Details</h3>
          <p className="text-xs text-slate-500">
            These details can be reused in invoice and quotation documents.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FieldInput
            {...register('bank_details.bank_name')}
            label="Bank Name"
            placeholder="Enter bank name"
            error={errors.bank_details?.bank_name?.message}
          />
          <FieldInput
            {...register('bank_details.account_no')}
            label="Account No"
            placeholder="Enter account number"
            error={errors.bank_details?.account_no?.message}
          />
          <FieldInput
            {...register('bank_details.ifsc')}
            label="IFSC"
            placeholder="Enter IFSC code"
            error={errors.bank_details?.ifsc?.message}
          />
          <FieldInput
            {...register('bank_details.branch')}
            label="Branch"
            placeholder="Enter branch"
            error={errors.bank_details?.branch?.message}
          />
        </div>
      </div>

      <Controller
        control={control}
        name="is_active"
        render={({ field }) => (
          <Switch isSelected={field.value} onChange={field.onChange}>
            Active firm
          </Switch>
        )}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onPress={onClose} isDisabled={isLoading}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" isDisabled={isLoading}>
          {isLoading ? 'Saving...' : initialData ? 'Update Account Details' : 'Create Account Details'}
        </Button>
      </div>
    </form>
  );
};
