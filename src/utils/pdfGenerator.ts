/**
 * PDF Generation utilities for certificates
 * High-quality version (A4, sharp text, proper scaling)
 * Uses html-to-image + jsPDF for better quality and performance
 */

export interface PDFGenerationOptions {
  filename?: string;
  quality?: number;
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  pixelRatio?: number;
}

/**
 * Generate a high-quality PDF from a given HTML element.
 * Uses html-to-image + jsPDF with correct DPI, aspect ratio, and A4 layout.
 */
export const generatePDFFromElement = async (
  element: HTMLElement,
  options: PDFGenerationOptions = {}
): Promise<void> => {
  const {
    filename = `Certificate_${new Date().toISOString().split('T')[0]}.pdf`,
    quality = 2, // base scale multiplier
    format = 'a4',
    orientation = 'portrait',
    pixelRatio = window.devicePixelRatio || 1,
  } = options;

  try {
    const [{ toPng }, { default: jsPDF }] = await Promise.all([
      import('html-to-image'),
      import('jspdf'),
    ]);

    // --- Wait for all images to load before capturing ---
    const images = element.querySelectorAll('img');
    await Promise.all(
      Array.from(images).map(
        (img) =>
          img.complete ||
          new Promise<void>((resolve) => {
            img.onload = img.onerror = () => resolve();
          })
      )
    );

    // --- High DPI scaling ---
    const scale = quality * pixelRatio;

    // --- Render element to PNG using html-to-image ---
    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: scale,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left',
      },
      filter: () => {
        // Filter out unwanted elements if needed
        return true;
      },
    });

    // --- Initialize jsPDF ---
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
      compress: false, // keep sharpness
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // --- Create image to get dimensions ---
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = dataUrl;
    });

    // --- Compute proportional image height ---
    const imgWidth = pdfWidth;
    const imgHeight = (img.height * pdfWidth) / img.width;

    let yOffset = 0;
    let heightLeft = imgHeight;

    // --- Add first page ---
    pdf.addImage(dataUrl, 'PNG', 0, yOffset, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // --- If content exceeds one page, continue ---
    while (heightLeft > 0) {
      yOffset = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(dataUrl, 'PNG', 0, yOffset, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    // --- Save PDF ---
    pdf.save(filename);
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};
/**
 * Alternative PDF generation using dom-to-image-more as fallback
 */
export const generatePDFFromElementFallback = async (
  element: HTMLElement,
  options: PDFGenerationOptions = {}
): Promise<void> => {
  const {
    filename = `Certificate_${new Date().toISOString().split('T')[0]}.pdf`,
    quality = 2,
    format = 'a4',
    orientation = 'portrait',
    pixelRatio = window.devicePixelRatio || 1,
  } = options;

  try {
    const [domtoimage, { default: jsPDF }] = await Promise.all([
      import('dom-to-image-more'),
      import('jspdf'),
    ]);

    // --- Wait for all images to load before capturing ---
    const images = element.querySelectorAll('img');
    await Promise.all(
      Array.from(images).map(
        (img) =>
          img.complete ||
          new Promise<void>((resolve) => {
            img.onload = img.onerror = () => resolve();
          })
      )
    );

    // --- High DPI scaling ---
    const scale = quality * pixelRatio;

    // --- Render element to PNG using dom-to-image-more ---
    const dataUrl = await domtoimage.toPng(element, {
      quality: 1.0,
      bgcolor: '#ffffff',
      width: element.scrollWidth * scale,
      height: element.scrollHeight * scale,
      style: {
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: `${element.scrollWidth}px`,
        height: `${element.scrollHeight}px`,
      },
    });

    // --- Initialize jsPDF ---
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
      compress: false,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // --- Create image to get dimensions ---
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = dataUrl;
    });

    // --- Compute proportional image height ---
    const imgWidth = pdfWidth;
    const imgHeight = (img.height * pdfWidth) / img.width;

    let yOffset = 0;
    let heightLeft = imgHeight;

    // --- Add first page ---
    pdf.addImage(dataUrl, 'PNG', 0, yOffset, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // --- If content exceeds one page, continue ---
    while (heightLeft > 0) {
      yOffset = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(dataUrl, 'PNG', 0, yOffset, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    // --- Save PDF ---
    pdf.save(filename);
  } catch (error) {
    console.error('Fallback PDF generation failed:', error);
    throw new Error('Failed to generate PDF with fallback method. Please try again.');
  }
};

export const isPDFGenerationAvailable = async (): Promise<boolean> => {
  try {
    await Promise.all([
      import('html-to-image'),
      import('jspdf')
    ]);
    return true;
  } catch {
    try {
      await Promise.all([
        import('dom-to-image-more'),
        import('jspdf')
      ]);
      return true;
    } catch {
      return false;
    }
  }
};