import React, { useRef, useState } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { InwardChalanTemplate, InwardChalanData } from "./InwardChalanTemplate";
import { generateInwardChalanPDFOptimized } from "../../utils/inwardChalanPDFGenerator";
import {
  PrinterIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Loader } from "../ui/loader";
import { toast } from "sonner";
import { INWARD_CHALAN_PRINT_STYLES } from "./inwardChalanPrintStyles";

interface InwardChalanPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  chalanData: InwardChalanData | null;
  loading?: boolean;
}

export const InwardChalanPreviewModal: React.FC<InwardChalanPreviewModalProps> = ({
  isOpen,
  onClose,
  chalanData,
  loading = false,
}) => {
  const chalanRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  /* ---------------- PRINT ---------------- */

  const handlePrint = () => {
    if (!chalanRef.current) return;
    setIsPrinting(true);

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      setIsPrinting(false);
      toast.error('Please allow popups to print');
      return;
    }

    // Get the chalan content element
    const chalanElement = chalanRef.current.querySelector('.chalan-print') as HTMLElement;
    const contentToPrint = chalanElement || chalanRef.current;

    // Clone the content
    const content = contentToPrint.cloneNode(true) as HTMLElement;

    // Wait for images to load
    const images = content.querySelectorAll('img');
    const imagePromises = Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(() => resolve(), 3000);
      });
    });

    Promise.all(imagePromises).then(() => {
      // Use modern DOM APIs - avoid deprecated document.write
      const doc = printWindow.document;
      
      // Set HTML structure using innerHTML (modern approach)
      doc.documentElement.innerHTML = '<head></head><body></body>';
      
      const head = doc.head;
      const body = doc.body;
      
      // Set document title
      const title = doc.createElement('title');
      title.textContent = 'Inward Chalan - Print';
      head.appendChild(title);
      
      // Set charset
      const meta = doc.createElement('meta');
      meta.setAttribute('charset', 'utf-8');
      head.appendChild(meta);
      
      // Create style element with shared CSS from inwardChalanPrintStyles.ts
      const style = doc.createElement('style');
      style.textContent = `
        /* Page Setup - minimal margins for print */
        @page {
          size: A4;
          margin: 5mm;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          color: #000;
          background: #f5f5f5;
          line-height: 1.4;
        }

        /* Shared inward chalan print styles - imported from inwardChalanPrintStyles.ts */
        ${INWARD_CHALAN_PRINT_STYLES}

        /* Remove screen-only styles */
        .shadow,
        .shadow-lg {
          box-shadow: none !important;
        }

        /* Print window specific - minimal padding, no double borders */
        @media print {
          body {
            padding: 0;
            margin: 0;
            background: #fff;
          }
          .chalan-print {
            margin: 0;
            padding: 0;
            max-width: 100%;
            border: none !important;
            box-shadow: none !important;
            counter-reset: page 0;
          }
          .chalan-header {
            page-break-after: avoid;
          }
          .chalan-title {
            page-break-after: avoid;
          }
          .summary {
            page-break-inside: avoid;
            page-break-after: avoid;
          }
          .table-container {
            page-break-inside: auto;
          }
          .items-table {
            page-break-inside: auto;
          }
          .items-table thead {
            display: table-header-group;
          }
          .items-table thead tr {
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          .items-table tbody {
            display: table-row-group;
          }
          .items-table .table-row {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          .items-table .total-row {
            page-break-inside: avoid;
            page-break-before: auto;
          }
          .page-info {
            display: block;
            position: fixed;
            bottom: 10mm;
            right: 10mm;
            font-size: 10px;
            color: #666;
          }
          .page-number::after {
            content: "Page " counter(page);
          }
          @page {
            counter-increment: page;
          }
        }
      `;
      head.appendChild(style);
      
      // Append cloned content to body
      body.appendChild(content);
      
      // Focus window - user can press Ctrl+P to print
      printWindow.focus();
      setIsPrinting(false);

      console.log('Print window opened. Press Ctrl+P (or Cmd+P on Mac) to print.');
    });
  };

  /* ---------------- PDF ---------------- */

  const handleDownloadPDF = async () => {
    if (!chalanRef.current || !chalanData) return;

    setIsGeneratingPDF(true);
    try {
      const filename = `Inward_Chalan_${chalanData.inward_chalan_number}_${new Date()
        .toISOString()
        .split("T")[0]}.pdf`;

      // Get the chalan template element (the actual content)
      const chalanElement = chalanRef.current.querySelector('.chalan-print') as HTMLElement;
      const elementToCapture = chalanElement || chalanRef.current;

      // Ensure all images are loaded before generating PDF
      const images = elementToCapture.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map(
          (img) =>
            img.complete ||
            new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve(); // Continue even if image fails
              // Timeout after 5 seconds
              setTimeout(() => resolve(), 5000);
            })
        )
      );

      // Use optimized PDF generator (programmatic download with minimal file size)
      // This generates PDFs under 1-3MB instead of 100MB+
      await generateInwardChalanPDFOptimized(elementToCapture, { filename });
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF error:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Inward Chalan Preview"
      className="max-w-[75vw] max-h-[95vh]"
    >
      <div className="flex flex-col h-full">

        {/* ACTIONS */}
        <div className="flex justify-center gap-4 p-4 border-b bg-gray-50 sticky top-0 z-10">
          <Button
            onClick={handlePrint}
            disabled={!chalanData || isPrinting || loading}
            className="bg-blue-600 text-white gap-2"
          >
            <PrinterIcon className="w-5 h-5" />
            {isPrinting ? "Printing..." : "Print"}
          </Button>

          <Button
            onClick={handleDownloadPDF}
            disabled={!chalanData || isGeneratingPDF || loading}
            className="bg-green-600 text-white gap-2"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            {isGeneratingPDF ? "Generating..." : "Download PDF"}
          </Button>

          <Button onClick={onClose} variant="outline">
            <XMarkIcon className="w-5 h-5" />
            Close
          </Button>
        </div>

        {/* PREVIEW */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
          {loading ? (
            <Loader text="Loading chalan..." />
          ) : !chalanData ? (
            <p className="text-center text-gray-500">
              No chalan data available
            </p>
          ) : (
            <div ref={chalanRef} className="bg-white shadow-lg" style={{ width: '210mm', margin: '0 auto' }}>
              <InwardChalanTemplate data={chalanData} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

