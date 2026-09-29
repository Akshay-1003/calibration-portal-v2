"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button, Modal } from "@heroui/react";
import { ArrowDownTrayIcon, PrinterIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Loader } from "../ui/loader";
import { toast } from "sonner";

interface CertificatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificateUrl?: string | null;
  isLoading?: boolean;
  loadingText?: string;
  fileName?: string;
}

const appendQueryParam = (url: string, key: string, value: string): string => {
  const [base, hash] = url.split("#");
  const separator = base.includes("?") ? "&" : "?";
  const next = `${base}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  return hash ? `${next}#${hash}` : next;
};

export const CertificatePreviewModal: React.FC<
  CertificatePreviewModalProps
> = ({
  isOpen,
  onClose,
  certificateUrl,
  isLoading = false,
  loadingText = "Loading certificate...",
  fileName = "certificate",
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [resolvedCertificateUrl, setResolvedCertificateUrl] = useState<string | null>(null);
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^\.+|\.+$/g, "") || "certificate";
  const pdfFileName = safeFileName.toLowerCase().endsWith(".pdf") ? safeFileName : `${safeFileName}.pdf`;

  useEffect(() => {
    if (!isOpen) return;
    const previousTitle = document.title;
    document.title = safeFileName;
    return () => {
      document.title = previousTitle;
    };
  }, [isOpen, safeFileName]);

  const buildFreshUrl = useCallback((url: string, extraParams?: Record<string, string>) => {
    let nextUrl = appendQueryParam(url, "_ts", Date.now().toString());
    if (extraParams) {
      Object.entries(extraParams).forEach(([key, value]) => {
        nextUrl = appendQueryParam(nextUrl, key, value);
      });
    }
    return nextUrl;
  }, []);

  // Handle iframe loading
  useEffect(() => {
    if (certificateUrl) {
      setIframeLoaded(false);
      setResolvedCertificateUrl(buildFreshUrl(certificateUrl));
    } else {
      setResolvedCertificateUrl(null);
    }
  }, [buildFreshUrl, certificateUrl]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIframeLoaded(false);
      setIsPrinting(false);
      setResolvedCertificateUrl(null);
    }
  }, [isOpen]);

  // Handle print functionality
  const handlePrint = useCallback(() => {
    if (!certificateUrl) {
      toast.error('Certificate not ready for printing');
      return;
    }

    const certificateUrlWithoutHeader = buildFreshUrl(certificateUrl, {
      show_header: "false",
    });
    setIsPrinting(true);
    try {
      // Open certificate in new window for printing
      const printWindow = window.open(certificateUrlWithoutHeader, '_blank', 'width=800,height=600');

      if (!printWindow) {
        toast.error('Please allow popups to print the certificate');
        setIsPrinting(false);
        return;
      }

      try {
        printWindow.document.title = safeFileName;
      } catch {
        // Cross-origin PDF viewers do not expose their document title.
      }

      // Wait for PDF to load, then trigger print dialog automatically
      printWindow.onload = () => {
        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
            setIsPrinting(false);
          } catch (err) {
            console.error('Print error:', err);
            setIsPrinting(false);
            toast.info('Certificate opened. Use Ctrl+P (Cmd+P on Mac) to print.');
          }
        }, 500);
      };

      // Fallback timeout in case onload doesn't fire
      setTimeout(() => {
        setIsPrinting(false);
      }, 3000);

    } catch (err) {
      console.error('Print error:', err);
      toast.error('Failed to open print dialog');
      setIsPrinting(false);
    }
  }, [buildFreshUrl, certificateUrl, safeFileName]);

  const handlePrintWithHeader = useCallback(() => {
    if (!certificateUrl) {
      toast.error('Certificate not ready for printing');
      return;
    }
    const certificateUrlWithHeader = buildFreshUrl(certificateUrl, {
      show_header: "true",
    });
    setIsPrinting(true);
    try {
      // Open certificate in new window for printing
      const printWindow = window.open(certificateUrlWithHeader, '_blank', 'width=800,height=600');

      if (!printWindow) {
        toast.error('Please allow popups to print the certificate');
        setIsPrinting(false);
        return;
      }

      try {
        printWindow.document.title = safeFileName;
      } catch {
        // Cross-origin PDF viewers do not expose their document title.
      }

      // Wait for PDF to load, then trigger print dialog automatically
      printWindow.onload = () => {
        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
            setIsPrinting(false);
          } catch (err) {
            console.error('Print error:', err);
            setIsPrinting(false);
            toast.info('Certificate opened. Use Ctrl+P (Cmd+P on Mac) to print.');
          }
        }, 500);
      };

      // Fallback timeout in case onload doesn't fire
      setTimeout(() => {
        setIsPrinting(false);
      }, 3000);

    } catch (err) {
      console.error('Print error:', err);
      toast.error('Failed to open print dialog');
      setIsPrinting(false);
    }
  }, [buildFreshUrl, certificateUrl, safeFileName]);

  const handleDownload = useCallback(async () => {
    if (!certificateUrl) {
      toast.error('Certificate not ready for download');
      return;
    }

    try {
      const response = await fetch(buildFreshUrl(certificateUrl), { cache: 'no-store' });
      if (!response.ok) throw new Error('Certificate download failed');
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = pdfFileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Certificate download error:', error);
      toast.error('Failed to download certificate');
    }
  }, [buildFreshUrl, certificateUrl, pdfFileName]);

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container size="full" scroll="inside" className="overflow-hidden">
          <Modal.Dialog className="max-h-[95vh]">
            <Modal.Header className="flex justify-between items-center border-b bg-white px-6 py-4">
              <div className="flex items-center gap-2">
                <Modal.Heading className="font-semibold text-lg">Certificate Preview</Modal.Heading>
              </div>

              <div className="flex items-center gap-3">

                {/* Print Button */}
                {resolvedCertificateUrl && (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      onPress={handleDownload}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      Download PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onPress={handlePrint}
                      isDisabled={isPrinting}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    >
                      <PrinterIcon className="w-4 h-4" />
                      {isPrinting ? 'Printing...' : 'Print'}
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onPress={handlePrintWithHeader}
                      isDisabled={isPrinting}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    >
                      <PrinterIcon className="w-4 h-4" />
                      {isPrinting ? 'Printing...' : 'Full Page Print'}
                    </Button>
                  </>
                )}

                <Button
                  size="sm"
                  variant="secondary"
                  onPress={onClose}
                  className="font-medium"
                >
                  <XMarkIcon className="w-4 h-4" />
                  Cancel
                </Button>
              </div>
            </Modal.Header>

            <Modal.Body className="bg-gray-50 p-0 overflow-hidden">
              {isLoading ? (
                <div className="min-h-[600px] flex items-center justify-center bg-white">
                  <Loader text={loadingText} />
                </div>
              ) : resolvedCertificateUrl ? (
                <div className="relative w-full h-[calc(95vh-80px)] flex items-center justify-center bg-gray-100">
                  {!iframeLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                      <Loader text={loadingText} />
                    </div>
                  )}

                  <div className="w-full h-full flex items-center justify-center p-4">
                    <iframe
                      key={resolvedCertificateUrl}
                      ref={iframeRef}
                      src={resolvedCertificateUrl}
                      title="Certificate Preview"
                      loading="eager"
                      className="w-full h-full bg-white shadow-lg rounded-lg border border-gray-200"
                      style={{ border: "none" }}
                      onLoad={() => setIframeLoaded(true)}
                    />
                  </div>
                </div>
              ) : (
                <div className="min-h-[600px] flex items-center justify-center text-gray-500">
                  <p className="text-lg">No certificate available</p>
                </div>
              )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
};
