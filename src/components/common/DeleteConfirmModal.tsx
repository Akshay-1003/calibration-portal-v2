import React from 'react';
import { Modal, Button } from '@heroui/react';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: React.ReactNode;
  confirmText?: string;
  confirmColor?: 'danger' | 'success' | 'primary';
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
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="text-sm text-gray-600">{message}</div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={onClose} isDisabled={isConfirmLoading}>
                {cancelText}
              </Button>
              <Button variant={confirmColor === 'danger' ? 'danger' : 'primary'} onPress={handleConfirm} isDisabled={isConfirmLoading}>
                {confirmText}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
