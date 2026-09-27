import React, { useEffect, useMemo, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import {
  DocumentArrowDownIcon,
  PrinterIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { QuotationForm } from '../../../components/billing/QuotationForm';
import { QuotationPDFDocument } from '../../../components/billing/QuotationPDFDocument';
import { QuotationItemsTable } from '../../../components/billing/QuotationItemsTable';
import { QuotationTemplate } from '../../../components/billing/QuotationTemplate';
import { TablePageWrapper } from '../../../components/layout/TablePageWrapper';
import { Button } from '../../../components/ui/button';
import {
  useCreateQuotationMutation,
  useQuotationDetailQuery,
  useUpdateQuotationMutation,
  useQuotationRevisionsQuery,
} from '../../../hooks/queries/quotations';
import {
  getQuotationDefaults,
  useQuotationStore,
  type Quotation,
} from '../../../store/quotationStore';

const today = new Date().toISOString().split('T')[0];

const getQuotationPdfFileName = (quotationNumber: string) => {
  const safeNumber = quotationNumber.trim().replace(/[^a-zA-Z0-9._-]+/g, '-');
  return `Quotation_${safeNumber || 'Document'}.pdf`;
};

const buildQuotationDocumentData = (
  quotation: Partial<Quotation> | Quotation | null | undefined,
): Quotation | null => {
  if (!quotation || !quotation.items || quotation.items.length === 0) {
    return null;
  }

  return {
    id: quotation.id || quotation.quotation_number || '',
    quotation_number: quotation.quotation_number || '',
    revision_number: quotation.revision_number || 0,
    parent_quotation_id: quotation.parent_quotation_id || null,
    root_quotation_id: quotation.root_quotation_id || null,
    revision_date: quotation.revision_date || null,
    revision_reason: quotation.revision_reason || null,
    quotation_date: quotation.quotation_date || today,
    quotation_type: 'regular',
    client_org_id: quotation.client_org_id || '',
    billing_firm_id: quotation.billing_firm_id || '',
    billing_firm_name: quotation.billing_firm_name || '',
    billing_firm_contact: quotation.billing_firm_contact || '',
    billing_firm_email: quotation.billing_firm_email || '',
    billing_firm_address: quotation.billing_firm_address || '',
    billing_firm_gst: quotation.billing_firm_gst || '',
    customer_name: quotation.customer_name || '',
    customer_contact: quotation.customer_contact,
    customer_email: quotation.customer_email,
    customer_address: quotation.customer_address,
    customer_gst: quotation.customer_gst || '',
    subject_line: quotation.subject_line || '',
    intro_note: quotation.intro_note || '',
    footer_note: quotation.footer_note || '',
    payment_terms: quotation.payment_terms || '',
    delivery_terms: quotation.delivery_terms || '',
    validity_days: quotation.validity_days,
    tax_note: quotation.tax_note || '',
    gst_type: quotation.gst_type || 'none',
    cgst_rate: quotation.cgst_rate || 0,
    sgst_rate: quotation.sgst_rate || 0,
    igst_rate: quotation.igst_rate || 0,
    taxable_amount: quotation.taxable_amount || 0,
    cgst_amount: quotation.cgst_amount || 0,
    sgst_amount: quotation.sgst_amount || 0,
    igst_amount: quotation.igst_amount || 0,
    round_off: quotation.round_off || 0,
    prepared_by: quotation.prepared_by || '',
    terms_conditions: quotation.terms_conditions || [],
    items: quotation.items || [],
    subtotal: quotation.subtotal || 0,
    total_discount: quotation.total_discount || 0,
    grand_total: quotation.grand_total || 0,
    status: quotation.status || 'draft',
    created_at: quotation.created_at || new Date().toISOString(),
    updated_at: quotation.updated_at || new Date().toISOString(),
  };
};

const mergeWithCurrentQuotation = (
  currentQuotation: Partial<Quotation> | null,
  apiQuotation: Quotation,
): Quotation => {
  const merged = buildQuotationDocumentData({
    ...currentQuotation,
    ...apiQuotation,
    items:
      apiQuotation.items.length > 0
        ? apiQuotation.items
        : currentQuotation?.items || [],
    terms_conditions:
      apiQuotation.terms_conditions && apiQuotation.terms_conditions.length > 0
        ? apiQuotation.terms_conditions
        : currentQuotation?.terms_conditions || [],
  });

  return merged || apiQuotation;
};

const downloadQuotationPDF = async (quotationData: Quotation) => {
  const filename = getQuotationPdfFileName(quotationData.quotation_number);

  const blob = await pdf(
    <QuotationPDFDocument data={quotationData} />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const printQuotationPDF = async (quotationData: Quotation) => {
  const blob = await pdf(
    <QuotationPDFDocument data={quotationData} />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const printWindow = window.open('', '_blank');
  let hasTriggeredPrint = false;

  const triggerPrint = () => {
    if (hasTriggeredPrint) {
      return;
    }

    hasTriggeredPrint = true;
    printWindow?.print();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!printWindow) {
    URL.revokeObjectURL(url);
    throw new Error('Please allow popups to print');
  }

  printWindow.document.title = getQuotationPdfFileName(
    quotationData.quotation_number,
  );
  printWindow.location.href = url;

  printWindow.onload = () => {
    setTimeout(triggerPrint, 500);
  };

  setTimeout(() => {
    if (printWindow.document.readyState === 'complete') {
      triggerPrint();
    }
  }, 2000);
};

const QuotationCreatePage = React.memo(() => {
  const navigate = useNavigate();
  const { quotationId } = useParams<{ quotationId: string }>();
  const isEditMode = Boolean(quotationId);
  console.log(
    'QuotationCreatePage rendered. isEditMode:',
    isEditMode,
    'quotationId:',
    quotationId,
  );
  const { currentQuotation, clearCurrentQuotation, setCurrentQuotation } =
    useQuotationStore();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [documentQuotation, setDocumentQuotation] = useState<Quotation | null>(
    null,
  );
  const detailQuery = useQuotationDetailQuery(quotationId ?? null, {
    enabled: isEditMode,
  });
  const revisionHistoryQuery = useQuotationRevisionsQuery(quotationId ?? null);
  const createQuotationMutation = useCreateQuotationMutation();
  const updateQuotationMutation = useUpdateQuotationMutation();

  useEffect(() => {
    if (!isEditMode || !quotationId) {
      return;
    }

    if (currentQuotation?.id === quotationId) {
      return;
    }

    clearCurrentQuotation();
    setDocumentQuotation(null);
  }, [clearCurrentQuotation, currentQuotation?.id, isEditMode, quotationId]);

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    clearCurrentQuotation();
    setCurrentQuotation({
      ...getQuotationDefaults(),
      quotation_date: today,
      status: 'draft',
      items: [],
    });
    setDocumentQuotation(null);
  }, [clearCurrentQuotation, isEditMode, setCurrentQuotation]);

  useEffect(() => {
    if (!detailQuery.data) {
      return;
    }

    const normalizedQuotation = buildQuotationDocumentData(detailQuery.data);
    if (!normalizedQuotation) {
      return;
    }

    setCurrentQuotation(normalizedQuotation);
    setDocumentQuotation(normalizedQuotation);
  }, [detailQuery.data, setCurrentQuotation]);

  const liveQuotationDocument = useMemo(
    () => buildQuotationDocumentData(currentQuotation),
    [currentQuotation],
  );
  const activeQuotationDocument = liveQuotationDocument || documentQuotation;
  const isSavingQuotation =
    createQuotationMutation.isPending || updateQuotationMutation.isPending;
  const isIssuedQuotation = Boolean(isEditMode && currentQuotation && currentQuotation.status !== 'draft');

  const handleGeneratePDF = async (
    quotation?: Partial<Quotation> | Quotation | null,
  ) => {
    const quotationData = buildQuotationDocumentData(
      quotation || activeQuotationDocument,
    );
    if (!quotationData) {
      toast.error('No quotation data available');
      return;
    }

    setIsGeneratingPDF(true);
    try {
      setDocumentQuotation(quotationData);
      await downloadQuotationPDF(quotationData);
      toast.success('PDF generated and downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    const quotationData = buildQuotationDocumentData(activeQuotationDocument);
    if (!quotationData) {
      toast.error('No quotation data available');
      return;
    }

    setIsPrinting(true);
    try {
      setDocumentQuotation(quotationData);
      void printQuotationPDF(quotationData)
        .catch((error) => {
          console.error('Print error:', error);
          toast.error(
            error instanceof Error
              ? error.message
              : 'Failed to open print dialog',
          );
        })
        .finally(() => {
          setIsPrinting(false);
        });
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to open print dialog');
      setIsPrinting(false);
    }
  };

  const handlePreview = () => {
    const quotationData = buildQuotationDocumentData(currentQuotation);
    if (!quotationData) {
      toast.error('Please add at least one quotation item first');
      return;
    }

    setDocumentQuotation(quotationData);
    setShowPreview(true);
  };

  const handleSaveQuotation = async () => {
    if (!currentQuotation?.billing_firm_name?.trim()) {
      toast.error('Please select or enter quotation from firm');
      return;
    }

    if (!currentQuotation?.customer_name?.trim()) {
      toast.error('Please enter customer name');
      return;
    }

    if (!currentQuotation.items || currentQuotation.items.length === 0) {
      toast.error('Please add at least one item to the quotation');
      return;
    }

    const responseQuotation =
      isEditMode && quotationId
        ? await updateQuotationMutation.mutateAsync({
            id: quotationId,
            quotation: {
              ...currentQuotation,
              id: quotationId,
              status: currentQuotation.status || 'draft',
            },
          })
        : await createQuotationMutation.mutateAsync({
            ...currentQuotation,
            status: currentQuotation.status || 'draft',
          });

    const mergedQuotation = mergeWithCurrentQuotation(
      currentQuotation,
      responseQuotation,
    );

    setCurrentQuotation(mergedQuotation);
    setDocumentQuotation(mergedQuotation);

    await handleGeneratePDF(mergedQuotation);

    if (!isEditMode && mergedQuotation.id) {
      navigate(`/billing/quotation/${mergedQuotation.id}/edit`, {
        replace: true,
      });
    }
  };

  if (isEditMode && detailQuery.isLoading && !currentQuotation) {
    return (
      <TablePageWrapper
        title="Quotation Management"
        description="Loading quotation details..."
        compact
      >
        <div className="p-10 text-center text-slate-500">
          Loading quotation...
        </div>
      </TablePageWrapper>
    );
  }

  if (isEditMode && detailQuery.error) {
    return (
      <TablePageWrapper
        title="Quotation Management"
        description="Unable to load quotation details."
        compact
        actions={
          <Button
            variant="outline"
            onClick={() => navigate('/billing/quotation')}
          >
            Back to Quotations
          </Button>
        }
      >
        <div className="p-10 text-center">
          <p className="mb-4 text-red-600">
            {(detailQuery.error as Error).message}
          </p>
          <Button onClick={() => detailQuery.refetch()} variant="outline">
            Retry
          </Button>
        </div>
      </TablePageWrapper>
    );
  }

  return (
    <div className="space-y-6">
      <TablePageWrapper
        title="Quotation Management"
        description={
          isEditMode
            ? 'Update an existing customer quotation and regenerate the PDF.'
            : 'Create and manage customer quotations for calibration services.'
        }
        compact
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/billing/quotation')}
              className="flex items-center gap-2"
            >
              Back
            </Button>
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={!liveQuotationDocument}
              className="flex items-center gap-2"
            >
              Preview
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={!activeQuotationDocument || isPrinting}
              className="flex items-center gap-2"
            >
              <PrinterIcon className="h-4 w-4" />
              Print
            </Button>
            <Button
              onClick={() => void handleSaveQuotation()}
              disabled={isSavingQuotation || isGeneratingPDF || isIssuedQuotation}
              className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              {isSavingQuotation || isGeneratingPDF
                ? isEditMode
                  ? 'Updating...'
                  : 'Creating...'
                : isEditMode
                  ? 'Update Quotation & PDF'
                  : 'Create Quotation & PDF'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <QuotationForm />

          {isEditMode && (currentQuotation?.revision_number ?? 0) > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              Revision R{currentQuotation?.revision_number}
              {currentQuotation?.revision_reason ? `: ${currentQuotation.revision_reason}` : ''}
            </div>
          )}

          {isEditMode && revisionHistoryQuery.data && revisionHistoryQuery.data.length > 1 && (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Revision History</h3>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                {revisionHistoryQuery.data.map((revision) => (
                  <button
                    key={revision.id}
                    type="button"
                    onClick={() => navigate(`/billing/quotation/${revision.id}/edit`)}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-700 hover:border-blue-400 hover:text-blue-600"
                  >
                    {revision.revision_number ? `R${revision.revision_number}` : 'Original'}
                    <span className="ml-1 text-xs text-slate-500">{revision.status}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-2">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              Quotation Items
            </h3>
            <QuotationItemsTable />
          </div>
        </div>
      </TablePageWrapper>

      {showPreview && activeQuotationDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-lg bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-4">
              <h2 className="text-xl font-semibold">
                Quotation Preview - {activeQuotationDocument.quotation_number}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => void handleGeneratePDF()}
                  disabled={isGeneratingPDF}
                  className="flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className="flex items-center gap-2"
                >
                  <PrinterIcon className="h-4 w-4" />
                  Print
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowPreview(false)}
                  className="flex items-center gap-2"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Close
                </Button>
              </div>
            </div>
            <div className="p-6">
              <QuotationTemplate data={activeQuotationDocument} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

QuotationCreatePage.displayName = 'QuotationCreatePage';

export default QuotationCreatePage;
