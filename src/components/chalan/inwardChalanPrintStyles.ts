/**
 * Shared CSS styles for inward chalan print
 * This file contains the CSS that's used both in the modal preview and print window
 * to avoid duplication
 */

export const INWARD_CHALAN_PRINT_STYLES = `
  .chalan-print {
    margin: 0 auto;
    max-width: 210mm;
    padding: 20px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    color: #000;
    background: #fff;
    line-height: 1.4;
    border: 1px solid #d0d0d0;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05);
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
    page-break-inside: auto;
  }

  .items-table thead {
    background: #f2f2f2;
    display: table-header-group;
  }

  .items-table thead tr {
    page-break-inside: avoid;
    page-break-after: avoid;
  }

  .items-table th {
    border: 1px solid #000;
    padding: 8px 6px;
    text-align: left;
    font-weight: bold;
    font-size: 11px;
    background: #f2f2f2;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .items-table tbody {
    display: table-row-group;
  }

  .items-table td {
    border: 1px solid #000;
    padding: 6px;
    vertical-align: top;
    word-wrap: break-word;
    font-size: 11px;
    page-break-inside: avoid;
  }

  /* Specification column - allow wrapping, smaller font */
  .items-table td:nth-child(6),
  .items-table th:nth-child(6) {
    font-size: 10px;
    line-height: 1.3;
    word-break: break-word;
    white-space: normal;
  }

  /* Lab ID column - allow wrapping for full ID display */
  .items-table td:nth-child(8),
  .items-table th:nth-child(8) {
    font-size: 10px;
    line-height: 1.2;
    word-break: break-all;
    white-space: normal;
    width: 9%;
    max-width: 9%;
  }

  .items-table .table-row {
    page-break-inside: avoid;
    page-break-after: auto;
  }

  .items-table .wrap {
    word-break: break-word;
    white-space: normal;
    max-width: 0;
  }

  .items-table .total-row {
    background: #f9f9f9;
    font-weight: bold;
    page-break-inside: avoid;
    page-break-before: auto;
  }

  .items-table .total-row td {
    background: #f9f9f9;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .items-table .right {
    text-align: right;
    padding-right: 12px;
  }

  .page-info {
    display: none;
    position: absolute;
    pointer-events: none;
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
      border: none !important;
      box-shadow: none !important;
      position: relative;
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
      display: block !important;
      position: fixed;
      bottom: 10mm;
      right: 10mm;
      font-size: 10px;
      color: #666;
      z-index: 9999;
      pointer-events: none;
    }
    
    .page-number::after {
      content: "Page " counter(page);
    }
    
    @page {
      counter-increment: page;
      size: A4;
      margin: 5mm;
    }
  }
`;

