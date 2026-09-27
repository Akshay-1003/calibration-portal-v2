import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Input,
  Select,
  SelectItem,
  Switch,
  Textarea,
} from '@heroui-v2/react';
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
  } = useForm<AccountDetailFormData>({
    resolver: zodResolver(accountDetailFormSchema),
    mode: 'onChange',
    defaultValues: toDefaultValues(initialData),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          {...register('firm_name')}
          label="Firm Name"
          labelPlacement="outside"
          placeholder="Enter firm name"
          isInvalid={Boolean(errors.firm_name)}
          errorMessage={errors.firm_name?.message}
        />

        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select
              label="Type"
              labelPlacement="outside"
              placeholder="Select firm type"
              selectedKeys={field.value ? [field.value] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as AccountDetailFormData['type'] | undefined;
                field.onChange(selected ?? 'Calibration Lab');
              }}
              isInvalid={Boolean(errors.type)}
              errorMessage={errors.type?.message}
            >
              {accountDetailTypes.map((type) => (
                <SelectItem key={type} textValue={type}>
                  {type}
                </SelectItem>
              ))}
            </Select>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          {...register('gst_no')}
          label="GST No"
          labelPlacement="outside"
          placeholder="Enter GST number"
          isInvalid={Boolean(errors.gst_no)}
          errorMessage={errors.gst_no?.message}
        />
        <Input
          {...register('pan_no')}
          label="PAN No"
          labelPlacement="outside"
          placeholder="Enter PAN number"
          isInvalid={Boolean(errors.pan_no)}
          errorMessage={errors.pan_no?.message}
        />
      </div>

      <Textarea
        {...register('address')}
        label="Address"
        labelPlacement="outside"
        placeholder="Enter firm address"
        minRows={3}
        isInvalid={Boolean(errors.address)}
        errorMessage={errors.address?.message}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Input
          {...register('contact_no')}
          label="Contact No"
          labelPlacement="outside"
          placeholder="Enter contact number"
          isInvalid={Boolean(errors.contact_no)}
          errorMessage={errors.contact_no?.message}
        />
        <Input
          {...register('email')}
          label="Email"
          labelPlacement="outside"
          placeholder="Enter email address"
          isInvalid={Boolean(errors.email)}
          errorMessage={errors.email?.message}
        />
        <Input
          {...register('website')}
          label="Website"
          labelPlacement="outside"
          placeholder="Enter website"
          isInvalid={Boolean(errors.website)}
          errorMessage={errors.website?.message}
        />
        <Input
          {...register('logo')}
          label="Logo URL"
          labelPlacement="outside"
          placeholder="Enter logo url"
          isInvalid={Boolean(errors.logo)}
          errorMessage={errors.logo?.message}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Bank Details</h3>
          <p className="text-xs text-slate-500">
            These details can be reused in invoice and quotation documents.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Input
            {...register('bank_details.bank_name')}
            label="Bank Name"
            labelPlacement="outside"
            placeholder="Enter bank name"
            isInvalid={Boolean(errors.bank_details?.bank_name)}
            errorMessage={errors.bank_details?.bank_name?.message}
          />
          <Input
            {...register('bank_details.account_no')}
            label="Account No"
            labelPlacement="outside"
            placeholder="Enter account number"
            isInvalid={Boolean(errors.bank_details?.account_no)}
            errorMessage={errors.bank_details?.account_no?.message}
          />
          <Input
            {...register('bank_details.ifsc')}
            label="IFSC"
            labelPlacement="outside"
            placeholder="Enter IFSC code"
            isInvalid={Boolean(errors.bank_details?.ifsc)}
            errorMessage={errors.bank_details?.ifsc?.message}
          />
          <Input
            {...register('bank_details.branch')}
            label="Branch"
            labelPlacement="outside"
            placeholder="Enter branch"
            isInvalid={Boolean(errors.bank_details?.branch)}
            errorMessage={errors.bank_details?.branch?.message}
          />
        </div>
      </div>

      <Controller
        control={control}
        name="is_active"
        render={({ field }) => (
          <Switch isSelected={field.value} onValueChange={field.onChange}>
            Active firm
          </Switch>
        )}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="flat" onPress={onClose} isDisabled={isLoading}>
          Cancel
        </Button>
        <Button color="primary" type="submit" isLoading={isLoading}>
          {initialData ? 'Update Account Details' : 'Create Account Details'}
        </Button>
      </div>
    </form>
  );
};
