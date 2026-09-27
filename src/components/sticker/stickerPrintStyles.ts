/**
 * Shared CSS styles for sticker printing.
 * 78mm thermal roll, 35x15mm stickers, 3.5mm inter-sticker gap.
 * Industrial text-only layout with strict left-label / right-value alignment.
 */

export const STICKER_PRINT_STYLES = `
  .sticker-print-container {
    width: 80mm;
    min-width: 78mm;
    max-width: 78mm;
    margin: 0;
    padding: 0;
    background: #fff;
    box-sizing: border-box;
  }

  .stickers-grid {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    justify-content: flex-start;
    width: 80mm;
    min-width: 80mm;
    max-width: 80mm;
    margin: 0;
    padding: 0 3.25mm;
    column-gap: 3.5mm;
    row-gap: 3.5mm;
    box-sizing: border-box;
  }

  .sticker-item {
    width: 35mm;
    min-width: 35mm;
    max-width: 35mm;
    height: 15mm;
    min-height: 15mm;
    max-height: 15mm;
    padding: 0.9mm 1.1mm;
    background: #fff;
    break-inside: avoid;
    page-break-inside: avoid;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    overflow: hidden;
    font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    box-sizing: border-box;
  }

  .sticker-fields {
    width: 32.8mm;
    min-width: 32.8mm;
    max-width: 32.8mm;
    height: 13.2mm;
    min-height: 13.2mm;
    max-height: 13.2mm;
    display: flex;
    flex-direction: column;
    justify-content: center;
    row-gap: 0.2mm;
    box-sizing: border-box;
  }

  .sticker-field-row {
    width: 32.8mm;
    min-width: 32.8mm;
    max-width: 32.8mm;
    display: flex;
    margin-left: auto;
    align-items: center;
    box-sizing: border-box;
  }

  .sticker-label,
  .sticker-value {
    margin: 0;
    padding: 0;
    min-width: 0mm;
    max-width: 32.8mm;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: clip;
    font-size: var(--sticker-font-size, 10px);
    line-height: 1.15;
    color: #000;
    box-sizing: border-box;
  }

  .sticker-label {
    font-weight: 600;
    text-align: left;
  }

  .sticker-value {
    font-weight: 700;
    text-align: right;
    margin-left: 0;
  }

  @media print {
    @page {
      size: 78mm auto !important;
      margin: 0 !important;
    }

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 78mm !important;
      min-width: 78mm !important;
      max-width: 78mm !important;
      background: #fff !important;
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }

    .sticker-print-container {
      width: 78mm !important;
      min-width: 78mm !important;
      max-width: 78mm !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .stickers-grid {
      width: 80mm !important;
      min-width: 80mm !important;
      max-width: 80mm !important;
      margin: 0 !important;
      padding: 0 3.25mm !important;
      column-gap: 3.5mm;
      row-gap: 3.5mm;
      box-sizing: border-box;
    }

    .sticker-item {
      width: 35mm;
      min-width: 35mm;
      max-width: 35mm;
      height: 15mm;
      min-height: 15mm;
      max-height: 15mm;
      padding: 0.9mm 1.1mm;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .sticker-label,
    .sticker-value {
      font-size: var(--sticker-font-size, 10px);
      line-height: 1.15;
    }
  }

  @media screen {
    html,
    body {
      margin: 0;
      padding: 0;
      background: #fff;
    }

    .sticker-print-container {
      width: 78mm;
      min-width: 78mm;
      max-width: 78mm;
      margin: 0 auto;
      padding: 0;
    }

    .stickers-grid {
      width: 80mm;
      min-width: 80mm;
      max-width: 80mm;
      padding: 0 3.25mm;
      box-sizing: border-box;
    }
  }
`;
