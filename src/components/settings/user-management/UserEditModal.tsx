import { useState } from 'react';
import { Button, Modal, ModalBody, ModalContent, ModalHeader, Spinner } from '@heroui-v2/react';
import { useUserPermissionsQuery } from '../../../hooks/queries/users';
import type { User } from '../../../features/auth/types/auth.types';
import { UserForm } from './UserForm';
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
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="5xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader className="flex items-center justify-between gap-4">
            <span>Edit User</span>
            {user ? (
              <Button
                size="sm"
                variant="flat"
                color="primary"
                onPress={() => setIsResetPasswordOpen(true)}
              >
                Reset Password
              </Button>
            ) : null}
          </ModalHeader>
          <ModalBody className="pb-6">
            {!user || permissionsQuery.isLoading ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <Spinner label="Loading user permissions..." />
              </div>
            ) : (
              <UserForm
                mode="edit"
                initialUser={user}
                initialPermissions={permissionsQuery.data ?? user.permissions ?? null}
                onSubmit={onSubmit}
                onClose={onClose}
                isLoading={isLoading}
                userType={userType}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

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
