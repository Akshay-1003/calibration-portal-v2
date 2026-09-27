import { Modal, ModalBody, ModalContent, ModalHeader } from '@heroui-v2/react';
import { UserForm } from './UserForm';
import type { ManagedUserFormValues } from './userManagementSchema';

interface UserCreateModalProps {
  isOpen: boolean;
  onOpenChange: () => void;
  onClose: () => void;
  onSubmit: (values: ManagedUserFormValues) => void | Promise<void>;
  isLoading?: boolean;
  userType?: 'laboratory' | 'customer';
  organizationOptions?: Array<{ id: string; name: string }>;
}

export const UserCreateModal = ({
  isOpen,
  onOpenChange,
  onClose,
  onSubmit,
  isLoading = false,
  userType = 'laboratory',
  organizationOptions = [],
}: UserCreateModalProps) => (
  <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="5xl" scrollBehavior="inside">
    <ModalContent>
      <ModalHeader>Create New User</ModalHeader>
      <ModalBody className="pb-6">
        <UserForm
          mode="create"
          onSubmit={onSubmit}
          onClose={onClose}
          isLoading={isLoading}
          userType={userType}
          organizationOptions={organizationOptions}
        />
      </ModalBody>
    </ModalContent>
  </Modal>
);
