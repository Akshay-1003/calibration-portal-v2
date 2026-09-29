import { Modal } from '@heroui/react';
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
  <Modal.Root isOpen={isOpen} onOpenChange={(open) => { if (!open) onOpenChange(); }}>
    <Modal.Backdrop>
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>Create New User</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="pb-6">
            <UserForm
              mode="create"
              onSubmit={onSubmit}
              onClose={onClose}
              isLoading={isLoading}
              userType={userType}
              organizationOptions={organizationOptions}
            />
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </Modal.Root>
);
