export const QUOTATION_PRINT_STYLES = `
	  .quotation-print {
	    margin: 0 auto;
	    width: 210mm;
    min-height: 297mm;
    font-family: Arial, Helvetica, sans-serif;
	    font-size: 11px;
    color: #1e1e1e;
    background: #ffffff;
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
  }

  .quotation-sheet {
    min-height: calc(297mm - 28px);
    background: #ffffff;
  }

  .quotation-topbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    padding: 18px 18px 14px;
    border-bottom: 1px solid #cfd5dd;
    align-items: start;
  }

  .quotation-brand {
    display: flex;
    align-items: flex-start;
  }

  .quotation-logo {
    width: 330px;
    max-width: 100%;
    height: auto;
    object-fit: contain;
  }

  .quotation-meta-stack {
    width: 220px;
    justify-self: end;
    align-self: end;
    margin-top: 8px;
    display: grid;
    gap: 4px;
  }

  .quotation-doc-title {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.2px;
  }

  .quotation-meta-item {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    white-space: nowrap;
  }

  .quotation-meta-label,
  .quotation-meta-value {
    font-size: 12px;
  }

  .quotation-meta-label {
    font-weight: 700;
    color: #1e1e1e;
  }

  .quotation-meta-value {
    font-weight: 500;
    color: #1e1e1e;
    text-align: right;
  }

	  .quotation-body {
	    padding: 14px;
	  }

  .quotation-party-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 18px;
  }

  .quotation-party-card {
    border: 1px solid #d2d2d2;
  }

  .quotation-party-title {
    padding: 5px 8px;
    background: #e1e2e3;
    border-bottom: 1px solid #d2d8e0;
    color: #1e1e1e;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.2px;
  }

  .quotation-party-body {
    padding: 5px 8px 5px;
    background: #ffffff;
  }

  .quotation-party-detail {
    display: grid;
    grid-template-columns: 74px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
    padding: 3px 0;
  }

  .quotation-party-detail-label {
    font-size: 12px;
    font-weight: 700;
    color: #1e1e1e;
  }

  .quotation-party-detail-value {
    font-size: 12px;
    color: #1e1e1e;
    line-height: 1;
    word-break: break-word;
  }

  .quotation-party-detail-value-strong {
    font-weight: 700;
    color: #1e1e1e;
  }

  .quotation-table-wrap {
    margin-bottom: 18px;
  }

  .quotation-items-table,
  .quotation-summary-table,
  .quotation-terms-table {
    width: 100%;
    border-collapse: collapse;
    
  }

  .quotation-items-table {
    table-layout: fixed;
    border: 1px solid #d2d2d2;
  }

  .quotation-items-table thead {
    display: table-header-group;
  }

  .quotation-items-table thead tr {
    page-break-after: avoid;
    page-break-inside: avoid;
  }

	  .quotation-items-table th {
    border: 1px solid #a3a3a3;
	    padding: 5px 4px;
    vertical-align: top;
    word-break: break-word;
  }
	  .quotation-items-table td {
	    border: 1px solid #d2d2d2;
	    padding: 5px 4px;
	    vertical-align: top;
	    word-break: break-word;
	    overflow-wrap: anywhere;
	  }
  .quotation-items-table th {
	    background: #7a7c7f;
	    color: #ffffff;
	    font-size: 10px;
    font-weight: 700;
    text-align: center;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .quotation-items-table td {
	    background: #ffffff;
	    font-size: 10.5px;
    color: #1e1e1e;
    page-break-inside: avoid;
  }

  .quotation-row-alt td {
    background: #f9fafb;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

	  .quotation-col-sr {
	    width: 5%;
	    text-align: center;
	  }

	  .quotation-col-gauge {
	    width: 18%;
	  }

	  .quotation-col-serial {
	    width: 10%;
	    text-align: center;
	  }

	  .quotation-col-make {
	    width: 10%;
	  }

	  .quotation-col-hsn {
	    width: 9%;
	    text-align: center;
	  }

	  .quotation-col-qty {
	    width: 5%;
	    text-align: center;
	  }

	  .quotation-col-range {
	    width: 16%;
	    text-align: center;
	  }

	  .quotation-col-money,
	  .quotation-col-final {
	    width: 10%;
	    text-align: right;
	  }
	  .quotation-col-discount {
	    width: 8%;
	  }

	  .quotation-col-final {
	    width: 9%;
	  }

	  .quotation-money {
	    text-align: right;
	    white-space: normal;
	  }

  .quotation-gauge-name {
    font-weight: 700;
    color: #1e1e1e;
  }

  .quotation-bottom-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 290px;
    gap: 16px;
    align-items: start;
  }

  .quotation-terms-box,
  .quotation-summary-box {
    border: 1px solid #d2d2d2;
    background: #ffffff;
  }

  .quotation-section-title {
    margin: 0;
    padding: 6px 10px;
    background: #e1e2e3;
    border-bottom: 1px solid #d2d8e0;
    color: #1e1e1e;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.2px;
  }

  .quotation-terms-table td {
    border-top: 1px solid #dce2ea;
    padding: 5px 8px;
    font-size: 12px;
    color: #1e1e1e;
    vertical-align: top;
    background: #ffffff;
  }

  .quotation-terms-sr {
    width: 42px;
    text-align: center;
    font-weight: 700;
    color: #1e1e1e;
    background: #f9fafb;
  }

  .quotation-empty-note {
    padding: 12px 14px;
    font-size: 12px;
    color: #1e1e1e;
    background: #ffffff;
  }

  .quotation-summary-table td {
    border-top: 1px solid #dce2ea;
    padding: 5px 8px;
    font-size: 12px;
    background: #ffffff;
  }

  .quotation-summary-table tbody tr:first-child td,
  .quotation-terms-table tbody tr:first-child td {
    border-top: none;
  }

  .quotation-summary-label {
    font-weight: 700;
    color: #1e1e1e;
    background: #f9fafb !important;
  }

  .quotation-summary-grand td {
    background: #e1e2e3 !important;
    color: #1e1e1e;
    font-size: 13px;
    font-weight: 800;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .quotation-signatures {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 28px;
    margin-top: 24px;
  }

  .quotation-sign-box {
    min-height: 64px;
  }

  .quotation-sign-title {
    margin: 0 0 30px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    color: #1e1e1e;
  }

  .quotation-sign-line {
    border-bottom: 1px solid #6b7280;
    margin-bottom: 5px;
  }

  .quotation-sign-caption {
    font-size: 10px;
    color: #1e1e1e;
  }

  @media print {
    body {
      padding: 0;
      margin: 0;
      background: #ffffff;
    }

    .quotation-print {
      margin: 0;
      padding: 0;
      border: none;
      box-shadow: none;
    }

    .quotation-sheet {
      border: 1px solid #1e1e1e;
    }
  }
`;
