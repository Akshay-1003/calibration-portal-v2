/**
 * Shared CSS styles for chalan print
 * This file contains the CSS that's used both in the modal preview and print window
 * to avoid duplication
 */

export const CHALAN_PRINT_STYLES = `
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
    flex-shrink: 0;
    font-size: 18px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .chalan-title h2 {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .chalan-number {
    font-size: 28px;
    font-weight: bold;
    text-align: right;
    line-height: 1;
  }

  .recipient {
    margin-bottom: 16px;
    font-size: 12px;
  }

  .recipient strong {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
  }

  .recipient-name {
    font-weight: bold;
    font-size: 14px;
    margin: 4px 0;
  }

  .recipient > div:last-child {
    font-size: 11px;
    color: #333;
  }

  .summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    border: 1px solid #000;
    padding: 10px;
    margin-bottom: 16px;
    background: #f9f9f9;
  }

  .summary > div {
    display: flex;
    flex-direction: column;
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
    overflow-wrap: break-word;
    word-break: normal;
    font-size: 11px;
    page-break-inside: avoid;
  }

  .items-table .table-row {
    page-break-inside: avoid;
    page-break-after: auto;
  }

  .items-table .wrap {
    overflow-wrap: break-word;
    word-break: normal;
    white-space: normal;
    max-width: none;
  }

  .items-table .specification-cell {
    line-height: 1.25;
    overflow-wrap: break-word;
    word-break: normal;
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

  .page-info {
    display: none;
    text-align: center;
    font-size: 10px;
    color: #666;
    margin-top: 10px;
  }

  .items-table .right {
    text-align: right;
    padding-right: 12px;
  }

  .footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #ccc;
    font-size: 11px;
  }

  .footer > div:first-child p {
    margin: 8px 0;
    line-height: 1.8;
  }

  .auth-sign {
    text-align: right;
  }

  .auth-sign strong {
    display: block;
    margin-bottom: 8px;
    font-size: 12px;
  }

  .auth-sign div {
    font-size: 11px;
    color: #666;
    margin-top: 20px;
  }

  @media print {
    body {
      padding: 15mm 10mm;
      margin: 0;
    }
    
    .chalan-print {
      margin: 0 auto;
      padding: 15px;
      max-width: 100%;
      border: 1px solid #d0d0d0;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05);
      counter-reset: page 0;
    }
    
    .chalan-header {
      page-break-after: avoid;
    }
    
    .recipient {
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
    
    .footer {
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
