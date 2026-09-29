import { useState } from 'react';
import { Button, Modal, Spinner } from '@heroui/react';
import { useUserPermissionsQuery } from '../../../hooks/queries/users';
import type { User } from '../../../features/auth/types/auth.types';
import { UserForm } from './UserForm';
import { normalizePermissionScope } from '../../../features/auth/utils/permissionHelpers';
import type { ManagedUserFormValues } from './userManagementSchema';
import { UserResetPasswordModal, type ResetUserPasswordFormValues } from './UserResetPasswordModal';

interface UserEditModalProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: () => void;
  onClose: () => void;
  onSubmit: (values: ManagedUserFormValues) => void | Promise<void>;
  onResetPassword: (values: ResetUserPasswordFormValues) => Promise<void>;
  isLoading?: boolean;
  isResetPasswordLoading?: boolean;
  userType?: 'laboratory' | 'customer';
}

export const UserEditModal = ({
  user,
  isOpen,
  onOpenChange,
  onClose,
  onSubmit,
  onResetPassword,
  isLoading = false,
  isResetPasswordLoading = false,
  userType = 'laboratory',
}: UserEditModalProps) => {
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const permissionsQuery = useUserPermissionsQuery(user?.id ?? '', {
    enabled: isOpen && !!user?.id,
  });

  return (
    <>
      <Modal.Root isOpen={isOpen} onOpenChange={(open) => { if (!open) onOpenChange(); }}>
        <Modal.Backdrop>
          <Modal.Container size="lg" scroll="inside">
            <Modal.Dialog>
              <Modal.Header className="flex items-center justify-between gap-4">
                <Modal.Heading>Edit User</Modal.Heading>
            {user ? (
              <Button
                size="sm"
                variant="primary"
                onPress={() => setIsResetPasswordOpen(true)}
              >
                Reset Password
              </Button>
            ) : null}
              </Modal.Header>
              <Modal.Body className="pb-6">
            {!user || permissionsQuery.isLoading ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <Spinner aria-label="Loading user permissions..." />
              </div>
            ) : (
              <UserForm
                mode="edit"
                initialUser={user}
                initialPermissions={normalizePermissionScope(permissionsQuery.data ?? user.permissions ?? null)}
                onSubmit={onSubmit}
                onClose={onClose}
                isLoading={isLoading}
                userType={userType}
              />
            )}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>

      <UserResetPasswordModal
        user={user}
        isOpen={isResetPasswordOpen}
        onOpenChange={() => setIsResetPasswordOpen(false)}
        onClose={() => setIsResetPasswordOpen(false)}
        onSubmit={onResetPassword}
        isLoading={isResetPasswordLoading}
      />
    </>
  );
};
