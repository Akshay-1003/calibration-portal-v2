/**
 * Optimized PDF Generator for Inward Challan
 * Uses browser's native print-to-PDF for vector-based, lightweight PDFs
 * This generates true vector PDFs (text-selectable, sharp on zoom) with minimal file size
 */

export interface InwardChalanPDFOptions {
  filename?: string;
}

/**
 * Generate a lightweight, vector-based PDF using browser's native print-to-PDF
 * This creates true vector PDFs (text-selectable, sharp) with file sizes under 1-3MB
 */
export const generateInwardChalanPDF = async (
  element: HTMLElement,
  options: InwardChalanPDFOptions = {}
): Promise<void> => {
  const { filename = `Inward_Chalan_${new Date().toISOString().split('T')[0]}.pdf` } = options;
  void filename;

  return new Promise((resolve, reject) => {
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (!printWindow) {
        reject(new Error('Please allow popups to generate PDF'));
        return;
      }

      // Clone the content
      const content = element.cloneNode(true) as HTMLElement;

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
        const doc = printWindow.document;
        
        // Set HTML structure
        doc.documentElement.innerHTML = '<head></head><body></body>';
        
        const head = doc.head;
        const body = doc.body;
        
        // Set document title
        const title = doc.createElement('title');
        title.textContent = 'Inward Chalan - PDF';
        head.appendChild(title);
        
        // Set charset
        const meta = doc.createElement('meta');
        meta.setAttribute('charset', 'utf-8');
        head.appendChild(meta);
        
        // Add viewport for proper scaling
        const viewport = doc.createElement('meta');
        viewport.setAttribute('name', 'viewport');
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
        head.appendChild(viewport);
        
        // Import print styles
        const style = doc.createElement('style');
        style.textContent = `
          @page {
            size: A4;
            margin: 10mm;
          }

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            color: #000;
            background: #fff;
            line-height: 1.4;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Import the print styles from the module */
          @import url('data:text/css;base64,${btoa(`
            .chalan-print {
              margin: 0 auto;
              max-width: 210mm;
              padding: 20px;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 12px;
              color: #000;
              background: #fff;
              line-height: 1.4;
            }

            .chalan-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #000;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }

            .company-info {
              flex: 1;
            }

            .company-logo {
              max-height: 60px;
              max-width: 200px;
              margin-bottom: 8px;
              display: block;
            }

            .company-info h1 {
              font-size: 18px;
              font-weight: bold;
              margin: 0 0 6px 0;
              text-transform: uppercase;
              line-height: 1.2;
            }

            .company-info p {
              margin: 2px 0;
              font-size: 11px;
              line-height: 1.4;
            }

            .chalan-title {
              text-align: center;
              margin-bottom: 16px;
            }

            .chalan-title h2 {
              margin: 0 0 8px 0;
              font-size: 18px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .chalan-title > div {
              font-size: 14px;
              font-weight: 600;
            }

            .summary {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 12px;
              border: 1px solid #000;
              padding: 10px;
              margin-bottom: 16px;
              background: #f9f9f9;
            }

            .summary > div {
              display: flex;
              flex-direction: column;
              border-right: 1px solid #000;
              padding-right: 8px;
              padding-left: 8px;
            }

            .summary > div:last-child {
              border-right: none;
            }

            .summary label {
              font-size: 10px;
              color: #666;
              margin-bottom: 4px;
              text-transform: uppercase;
              font-weight: 500;
            }

            .summary span {
              font-weight: bold;
              font-size: 13px;
              color: #000;
            }

            .table-container {
              width: 100%;
              margin-bottom: 20px;
              overflow: visible;
            }

            .items-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
              table-layout: fixed;
            }

            .items-table thead {
              background: #f2f2f2;
              display: table-header-group;
            }

            .items-table th {
              border: 1px solid #000;
              padding: 8px 6px;
              text-align: left;
              font-weight: bold;
              font-size: 11px;
              background: #f2f2f2;
            }

            .items-table td {
              border: 1px solid #000;
              padding: 6px;
              vertical-align: top;
              word-wrap: break-word;
              font-size: 11px;
            }

            .items-table .wrap {
              word-break: break-word;
              white-space: normal;
            }

            .items-table .total-row {
              background: #f9f9f9;
              font-weight: bold;
            }

            .items-table .total-row td {
              background: #f9f9f9;
            }

            .items-table .right {
              text-align: right;
              padding-right: 12px;
            }

            @media print {
              body {
                padding: 0;
                margin: 0;
              }
              
              .chalan-print {
                margin: 0;
                padding: 0;
                max-width: 100%;
                border: none;
                box-shadow: none;
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
              
              .items-table {
                page-break-inside: auto;
              }
              
              .items-table thead {
                display: table-header-group;
              }
              
              .items-table tbody tr {
                page-break-inside: avoid;
              }
              
              .items-table .total-row {
                page-break-inside: avoid;
                page-break-before: auto;
              }
            }
          `)}');
        `;
        head.appendChild(style);
        
        // Append cloned content
        body.appendChild(content);
        
        // Wait for content to render, then trigger print
        printWindow.onload = () => {
          setTimeout(() => {
            // Use browser's native print-to-PDF
            printWindow.print();
            // Close window after a delay (user can save PDF from print dialog)
            setTimeout(() => {
              printWindow.close();
              resolve();
            }, 1000);
          }, 500);
        };

        // Fallback if onload doesn't fire
        setTimeout(() => {
          if (printWindow.document.readyState === 'complete') {
            printWindow.print();
            setTimeout(() => {
              printWindow.close();
              resolve();
            }, 1000);
          }
        }, 2000);
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Alternative: Generate PDF using optimized html-to-image + jsPDF
 * This is a fallback if browser print doesn't work, but with optimizations
 * BALANCED OPTIMIZATION: High quality (print-ready) with smart compression for reasonable file size
 * Expected file size: 2-5MB (down from 100MB+) while maintaining professional print quality
 */
export const generateInwardChalanPDFOptimized = async (
  element: HTMLElement,
  options: InwardChalanPDFOptions = {}
): Promise<void> => {
  const { filename = `Inward_Chalan_${new Date().toISOString().split('T')[0]}.pdf` } = options;

  try {
    const [{ toPng }, { default: jsPDF }] = await Promise.all([
      import('html-to-image'),
      import('jspdf'),
    ]);

    // Wait for images
    const images = element.querySelectorAll('img');
    await Promise.all(
      Array.from(images).map(
        (img) =>
          img.complete ||
          new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(() => resolve(), 3000);
          })
      )
    );

    // BALANCED OPTIMIZATION: High quality with smart compression
    // Use quality 1.5-2.0 for crisp text and borders while keeping file size reasonable
    const scale = 1.8; // Good balance: high quality but not excessive (was 1.0, max would be 3.0)

    // Render to PNG with high quality settings
    const dataUrl = await toPng(element, {
      quality: 0.98, // High quality (0.95-0.98) for sharp text and borders
      pixelRatio: scale, // Good resolution for print quality
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left',
      },
      // Filter out any unnecessary elements
      filter: (node) => {
        // Keep all nodes, but we can optimize images
        if (node instanceof HTMLImageElement) {
          // Images will be compressed by jsPDF
          return true;
        }
        return true;
      },
    });

    // Initialize jsPDF with compression enabled (but not maximum)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true, // Enable compression for smaller file size
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Get image dimensions
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = dataUrl;
    });

    // Calculate dimensions
    const imgWidth = pdfWidth;
    const imgHeight = (img.height * pdfWidth) / img.width;

    let yOffset = 0;
    let heightLeft = imgHeight;

    // Add first page with MEDIUM compression (better quality than FAST, still optimized)
    // 'MEDIUM' provides good balance between quality and file size
    pdf.addImage(dataUrl, 'PNG', 0, yOffset, imgWidth, imgHeight, undefined, 'MEDIUM');
    heightLeft -= pdfHeight;

    // Add additional pages if needed
    while (heightLeft > 0) {
      yOffset = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(dataUrl, 'PNG', 0, yOffset, imgWidth, imgHeight, undefined, 'MEDIUM');
      heightLeft -= pdfHeight;
    }

    // Save PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Optimized PDF generation failed:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};
