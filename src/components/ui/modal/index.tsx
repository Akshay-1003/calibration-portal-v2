import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../../lib/utils';
import { Button } from '../button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
  title?: string;
  description?: string;
  isFullscreen?: boolean;
  headerActions?: React.ReactNode;
  headerClassName?: string;
  bodyClassName?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  size = 'md',
  title,
  description,
  isFullscreen = false,
  headerActions,
  headerClassName,
  bodyClassName,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, closeOnEscape]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  const contentClasses = isFullscreen
    ? "w-full h-full"
    : cn(
        "relative w-full bg-white rounded-xl shadow-theme-xl animate-slide-in max-h-[90vh] overflow-hidden",
        sizeClasses[size],
        className
      );

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center overflow-y-auto z-50",
        !isFullscreen && "p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      )}
      onClick={!isFullscreen ? handleOverlayClick : undefined}
    >
      {!isFullscreen && (
        <div
          className="fixed inset-0 h-full w-full bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <div
        ref={modalRef}
        className={contentClasses}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
      >
        {(title || showCloseButton || headerActions) && (
          <div className={cn("flex items-center justify-between p-6 border-b border-secondary-200", headerClassName)}>
            <div className="flex-1">
              {title && (
                <h2 id="modal-title" className="text-xl font-semibold text-secondary-900">
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="mt-1 text-sm text-secondary-600">
                  {description}
                </p>
              )}
            </div>
            {headerActions ? (
              <div className="ml-4 flex shrink-0 items-center gap-2">
                {headerActions}
              </div>
            ) : null}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                className="ml-4"
                aria-label="Close modal"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            )}
          </div>
        )}
        <div className={cn(
          "overflow-y-auto",
          !isFullscreen && "max-h-[calc(90vh-120px)]",
          bodyClassName
        )}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export { Modal };
