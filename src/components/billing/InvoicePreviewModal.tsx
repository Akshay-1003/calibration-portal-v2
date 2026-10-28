import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { InvoiceTemplate, InvoiceData } from './InvoiceTemplate';
import { InvoicePDFDocument } from './InvoicePDFDocument';
import { pdf } from '@react-pdf/renderer';
import { PrinterIcon, ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Loader } from '../ui/loader';
import { toast } from 'sonner';
import { useInvoiceStore } from '../../store/invoiceStore';
import { transformInvoiceToInvoiceData } from './invoiceUtils';
import { useAccountDetailQuery, useAccountDetailsQuery } from '../../hooks/queries/accountDetails';
import type { AccountDetail } from '../../types/accountDetails';
import type { Invoice } from '../../types/types';
import { resolveInvoiceStandardSpecifications } from '../../utils/standardSpecificationResolver';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData?: InvoiceData | null; // Optional - can be provided directly or fetched via invoiceId
  invoiceId?: string; // Optional - if provided, will fetch from cache/store
  loading?: boolean;
}

const getInvoicePdfFileName = (invoiceNumber: string) => {
  const safeNumber = invoiceNumber.trim().replace(/[^a-zA-Z0-9._-]+/g, '-');
  return `Invoice_${safeNumber || 'Document'}.pdf`;
};

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  invoiceData: providedInvoiceData,
  invoiceId,
  loading: providedLoading = false,
}) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Get invoice from store if invoiceId is provided
  const { fetchInvoice, getCachedInvoice, loadingCurrentInvoice } = useInvoiceStore();
  const [localInvoice, setLocalInvoice] = useState<Invoice | null>(null);
  const [resolvedPreviewData, setResolvedPreviewData] = useState<InvoiceData | null>(null);
  const [isResolvingSpecifications, setIsResolvingSpecifications] = useState(false);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const localBillingFirmId = localInvoice?.billing_firm_id?.trim() || null;
  const localBillingFirmName = localInvoice?.billing_firm_name?.trim() || '';
  const accountDetailQuery = useAccountDetailQuery(localBillingFirmId, {
    enabled: isOpen && !providedInvoiceData && Boolean(localBillingFirmId),
  });
  const accountDetailsQuery = useAccountDetailsQuery({
    enabled: isOpen && !providedInvoiceData && !localBillingFirmId && Boolean(localBillingFirmName),
  });
  const accountDetails = useMemo(
    () => accountDetailsQuery.data?.accountDetails ?? [],
    [accountDetailsQuery.data?.accountDetails],
  );

  const resolvedBillingFirm = useMemo<AccountDetail | null>(() => {
    if (!localInvoice) return null;
    if (accountDetailQuery.data) return accountDetailQuery.data;

    const billingFirmName = localBillingFirmName.toLowerCase();

    return (
      accountDetails.find((account) => {
        if (localBillingFirmId && account.id === localBillingFirmId) return true;
        return Boolean(billingFirmName && account.firm_name.trim().toLowerCase() === billingFirmName);
      }) ?? null
    );
  }, [accountDetailQuery.data, accountDetails, localBillingFirmId, localBillingFirmName, localInvoice]);

  const transformedLocalInvoiceData = useMemo(() => {
    if (!localInvoice) return null;
    return transformInvoiceToInvoiceData(localInvoice, resolvedBillingFirm);
  }, [localInvoice, resolvedBillingFirm]);

  // Fetch invoice if invoiceId is provided and no invoiceData
  useEffect(() => {
    if (!isOpen) {
      setLocalInvoice(null);
      return;
    }

    // If invoiceData is provided directly, use it
    if (providedInvoiceData) {
      setLocalInvoice(null);
      return;
    }

    // If invoiceId is provided, fetch from cache/store
    if (invoiceId) {
      setIsLoadingInvoice(true);
      
      // Check cache first
      const cachedInvoice = getCachedInvoice(invoiceId);
      if (cachedInvoice) {
        setLocalInvoice(cachedInvoice);
        setIsLoadingInvoice(false);
        return;
      }

      // If not in cache, fetch from API
      fetchInvoice(invoiceId, true)
        .then((invoice) => {
          if (invoice) {
            setLocalInvoice(invoice);
          } else {
            toast.error('Failed to load invoice data');
          }
        })
        .catch((error) => {
          console.error('Error fetching invoice:', error);
          toast.error('Failed to load invoice data');
        })
        .finally(() => {
          setIsLoadingInvoice(false);
        });
    }
  }, [isOpen, invoiceId, providedInvoiceData, fetchInvoice, getCachedInvoice]);

  // Resolve plain-thread specification IDs before enabling print/download.
  const sourceInvoiceData = providedInvoiceData || transformedLocalInvoiceData;
  useEffect(() => {
    let active = true;
    if (!isOpen || !sourceInvoiceData) {
      setResolvedPreviewData(null);
      setIsResolvingSpecifications(false);
      return () => { active = false; };
    }

    setIsResolvingSpecifications(true);
    resolveInvoiceStandardSpecifications(sourceInvoiceData.items)
      .then((items) => {
        if (active) setResolvedPreviewData({ ...sourceInvoiceData, items });
      })
      .finally(() => {
        if (active) setIsResolvingSpecifications(false);
      });

    return () => { active = false; };
  }, [isOpen, sourceInvoiceData]);

  const invoiceData = resolvedPreviewData || sourceInvoiceData;
  const waitingForBillingFirm =
    !providedInvoiceData &&
    Boolean(localInvoice) &&
    (
      (Boolean(localBillingFirmId) && accountDetailQuery.isLoading) ||
      (!localBillingFirmId && Boolean(localBillingFirmName) && accountDetailsQuery.isLoading)
    );
  const loading = providedLoading || isLoadingInvoice || loadingCurrentInvoice || waitingForBillingFirm || isResolvingSpecifications;

  /* ---------------- PRINT ---------------- */
  const handlePrint = async () => {
    if (!invoiceData) return;
    setIsPrinting(true);

    try {
      // Generate PDF blob using @react-pdf/renderer
      const blob = await pdf(<InvoicePDFDocument data={invoiceData} />).toBlob();
      
      // Create object URL and open in new window for printing
      const url = URL.createObjectURL(blob);
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        toast.error('Please allow popups to print');
        setIsPrinting(false);
        URL.revokeObjectURL(url);
        return;
      }

      printWindow.document.title = getInvoicePdfFileName(invoiceData.invoice_number);
      printWindow.location.href = url;

      // Wait for PDF to load, then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          setIsPrinting(false);
          // Clean up after a delay
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, 500);
      };

      // Fallback: if onload doesn't fire, try print after delay
      setTimeout(() => {
        if (printWindow.document.readyState === 'complete') {
          printWindow.print();
          setIsPrinting(false);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      }, 2000);
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to prepare print. Please try again.');
      setIsPrinting(false);
    }
  };

  /* ---------------- PDF ---------------- */
  const handleDownloadPDF = async () => {
    if (!invoiceData) return;

    setIsGeneratingPDF(true);
    try {
      const filename = getInvoicePdfFileName(invoiceData.invoice_number);

      // Generate PDF using @react-pdf/renderer
      const blob = await pdf(<InvoicePDFDocument data={invoiceData} />).toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF error:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  /* ---------------- UI ---------------- */
  const modalTitle = invoiceData 
    ? `Invoice Preview - ${invoiceData.invoice_number}` 
    : invoiceId 
      ? `Invoice Preview - Loading...` 
      : 'Invoice Preview';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      showCloseButton={false}
      size="full"
      className="h-[94vh] max-h-[94vh] max-w-[min(96vw,1500px)]"
      headerClassName="px-5 py-3"
      bodyClassName="h-[calc(94vh-57px)] max-h-none overflow-hidden"
      headerActions={
        <>
          <Button
            onClick={handlePrint}
            disabled={!invoiceData || isPrinting || loading}
            size="icon"
            className="h-9 w-9 bg-blue-600 text-white hover:bg-blue-700"
            aria-label={isPrinting ? 'Printing invoice' : 'Print invoice'}
            title={isPrinting ? 'Printing...' : 'Print'}
          >
            <PrinterIcon className="h-5 w-5" />
          </Button>

          <Button
            onClick={handleDownloadPDF}
            disabled={!invoiceData || isGeneratingPDF || loading}
            size="icon"
            className="h-9 w-9 bg-green-600 text-white hover:bg-green-700"
            aria-label={isGeneratingPDF ? 'Generating invoice PDF' : 'Download invoice PDF'}
            title={isGeneratingPDF ? 'Generating...' : 'Download PDF'}
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
          </Button>

          <Button
            onClick={onClose}
            variant="outline"
            size="icon"
            className="h-9 w-9"
            aria-label="Close invoice preview"
            title="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </>
      }
    >
      <div className="flex h-full flex-col">
        {/* PREVIEW */}
        <div className="min-h-0 flex-1 overflow-auto bg-gray-100 p-2">
          {loading ? (
            <Loader text="Loading invoice..." />
          ) : !invoiceData ? (
            <p className="text-center text-gray-500">No invoice data available</p>
          ) : (
            <div className="flex min-h-full justify-center">
              <div
                ref={invoiceRef}
                className="bg-white shadow-sm"
                style={{ maxWidth: '100%', margin: '0 auto' }}
              >
                <InvoiceTemplate data={invoiceData} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
