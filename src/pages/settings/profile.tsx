import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Input,
  Button,
  Card,
} from "@heroui/react";
import { ArrowUpTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { FormField } from '../../components/ui/form-field';
import {
  useUpdateProfileMutation,
  useUploadSignatureMutation,
} from '../../hooks/queries/users';
import { authSchemas, type ProfileFormData } from '../../features/auth/utils/authUtils';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useAuthStore } from '../../features/auth/store/authStore';
import { userRoleOptions } from '../../components/settings/user-management/permissionConfig';
import { extractApiFieldErrors, resolveApiFieldName } from '../../utils/apiFieldErrors';

const ACCEPTED_SIGNATURE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
]);

const formatNullable = (value: string | null | undefined) => {
  const normalizedValue = value?.trim();

  if (
    !normalizedValue ||
    normalizedValue === '-' ||
    normalizedValue.toLowerCase() === 'none' ||
    normalizedValue.toLowerCase() === 'null' ||
    normalizedValue.toLowerCase() === 'undefined'
  ) {
    return 'Not assigned';
  }

  return normalizedValue;
};

const isSupportedSignatureFile = (file: File) => {
  if (ACCEPTED_SIGNATURE_TYPES.has(file.type)) {
    return true;
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension === 'png' || extension === 'jpg' || extension === 'jpeg' || extension === 'svg';
};

const profileFieldAliases = {
  email: 'email',
  'first name': 'first_name',
  first_name: 'first_name',
  'last name': 'last_name',
  last_name: 'last_name',
  department: 'department',
} as const;

export const SettingsProfile = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user, isInitialized } = useAuth();
  const updateProfileMutation = useUpdateProfileMutation();
  const uploadSignatureMutation = useUploadSignatureMutation();
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [selectedSignatureFile, setSelectedSignatureFile] = useState<File | null>(null);
  const [signaturePreviewUrl, setSignaturePreviewUrl] = useState<string | null>(null);

  const existingSignatureUrl = user?.signature_url || user?.signature || null;
  const isPlatformSuperAdmin = user?.role === 'super_admin' || user?.role === 'superadmin';
  const roleLabel = useMemo(
    () => userRoleOptions.find((option) => option.key === user?.role)?.label ?? formatNullable(user?.role),
    [user?.role]
  );
  const organizationLabel = useMemo(() => {
    const organizationName = user?.organization_name?.trim() || user?.organization?.name?.trim();

    if (organizationName) {
      return organizationName;
    }

    return formatNullable(user?.organization_id);
  }, [user?.organization?.name, user?.organization_id, user?.organization_name]);

  const defaultValues = useMemo(
    () => ({
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      email: user?.email ?? '',
      department: user?.department ?? '',
    }),
    [user]
  );

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(authSchemas.profile),
    defaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    if (user) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form, user]);

  useEffect(() => {
    if (!selectedSignatureFile) {
      setSignaturePreviewUrl(existingSignatureUrl);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedSignatureFile);
    setSignaturePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [existingSignatureUrl, selectedSignatureFile]);

  const onSubmit = async (data: ProfileFormData) => {
    form.clearErrors();

    try {
      const updatedUser = await updateProfileMutation.mutateAsync(data);
      useAuthStore.getState().setUser(updatedUser);
    } catch (error) {
      const entries = extractApiFieldErrors(error);

      for (const entry of entries) {
        const fieldName = resolveApiFieldName(entry, profileFieldAliases);
        if (!fieldName) {
          continue;
        }

        form.setError(fieldName, {
          type: 'manual',
          message: entry.message,
        });
      }

      if (!entries.length) {
        form.setError('root', {
          type: 'manual',
          message: 'Failed to update profile',
        });
      }
    }
  };

  const handleSignatureSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (!isSupportedSignatureFile(file)) {
      setSelectedSignatureFile(null);
      setSignatureError('Only PNG, JPG, JPEG, and SVG files are allowed for signatures.');
      return;
    }

    setSignatureError(null);
    setSelectedSignatureFile(file);
  };

  const handleSignatureUpload = async () => {
    if (!user?.id || !selectedSignatureFile) {
      return;
    }

    setSignatureError(null);

    try {
      await uploadSignatureMutation.mutateAsync({
        userId: user.id,
        file: selectedSignatureFile,
      });
      setSelectedSignatureFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Signature upload failed:', error);
      setSignatureError(
        error instanceof Error ? error.message : 'Failed to upload signature.'
      );
    }
  };

  if (!isInitialized || !user) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200">
        <Card.Header className="pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold">Profile Information</h2>
            <p className="text-sm text-gray-500 mt-1">
              Your account details are loaded from the authenticated profile response.
            </p>
          </div>
        </Card.Header>

        <Card.Content className="p-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <FormField label="Username">
                <Input value={user.username || ''} readOnly />
              </FormField>

              <FormField label="Role">
                <Input value={roleLabel} readOnly />
              </FormField>

              <FormField label="First Name" required error={form.formState.errors.first_name?.message}>
                <Input {...form.register('first_name')} />
              </FormField>

              <FormField label="Last Name" required error={form.formState.errors.last_name?.message}>
                <Input {...form.register('last_name')} />
              </FormField>

              <FormField label="Email" required error={form.formState.errors.email?.message}>
                <Input {...form.register('email')} type="email" />
              </FormField>

              <FormField label="Department" error={form.formState.errors.department?.message}>
                <Input {...form.register('department')} />
              </FormField>

              {!isPlatformSuperAdmin && (
                <>
                  <FormField label="Organization">
                    <Input value={organizationLabel} readOnly />
                  </FormField>

                  <FormField label="Lab ID">
                    <Input value={formatNullable(user.lab_id)} readOnly />
                  </FormField>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              {form.formState.errors.root ? (
                <div className="mr-auto rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {form.formState.errors.root.message}
                </div>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                onPress={() => form.reset(defaultValues)}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                isDisabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>

      <Card className="border border-gray-200">
        <Card.Header className="pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between w-full gap-4">
            <div>
              <h2 className="text-lg font-semibold">Signature Upload</h2>
              <p className="text-sm text-gray-500 mt-1">
                Upload a PNG, JPG, JPEG, or SVG signature for certificate workflows.
              </p>
            </div>
          </div>
        </Card.Header>

        <Card.Content className="p-6 space-y-5">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex h-40 w-full max-w-sm items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50">
              {signaturePreviewUrl ? (
                <img
                  src={signaturePreviewUrl}
                  alt="Signature preview"
                  className="max-h-32 max-w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-sm text-gray-500">
                  <DocumentTextIcon className="h-8 w-8" />
                  <span>No signature uploaded</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                className="hidden"
                onChange={handleSignatureSelection}
              />

              <div className="space-y-2">
                <Button
                  variant="secondary"
                  onPress={() => fileInputRef.current?.click()}
                >
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  Select Signature File
                </Button>
                <p className="text-sm text-gray-600">
                  {selectedSignatureFile
                    ? `Selected file: ${selectedSignatureFile.name}`
                    : 'Choose a file to upload your signature.'}
                </p>
                {signatureError && (
                  <p className="text-sm text-red-600">{signatureError}</p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="primary"
                  isDisabled={!selectedSignatureFile}
                  onPress={handleSignatureUpload}
                >
                  {uploadSignatureMutation.isPending ? "Uploading..." : "Upload Signature"}
                </Button>
                <Button
                  variant="secondary"
                  isDisabled={!selectedSignatureFile}
                  onPress={() => {
                    setSelectedSignatureFile(null);
                    setSignatureError(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};
