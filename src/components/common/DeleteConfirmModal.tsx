import React from 'react';
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Button,
} from '@heroui-v2/react';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: React.ReactNode;
  confirmText?: string;
  confirmColor?: React.ComponentProps<typeof Button>['color'];
  cancelText?: string;
  isConfirmLoading?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export function DeleteConfirmModal({
  isOpen,
  title = 'Confirm deletion',
  message,
  confirmText = 'Delete',
  confirmColor = 'danger',
  cancelText = 'Cancel',
  isConfirmLoading = false,
  onConfirm,
  onClose,
}: DeleteConfirmModalProps) {
  const handleConfirm = React.useCallback(async () => {
    try {
      await onConfirm();
      onClose();
    } catch {
      // Keep modal open on error; callers should show a toast.
    }
  }, [onConfirm, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">{title}</ModalHeader>
            <ModalBody>
              <div className="text-sm text-gray-600">{message}</div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose} isDisabled={isConfirmLoading}>
                {cancelText}
              </Button>
              <Button color={confirmColor} onPress={handleConfirm} isLoading={isConfirmLoading}>
                {confirmText}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

