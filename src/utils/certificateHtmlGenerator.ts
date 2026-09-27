/**
 * Generate HTML string for certificate from certificate data
 * Uses the HTML template structure from the provided template
 */

import type { CertificateData } from '../components/certificate/certificateTypes';
import type { Observations, Specifications } from '../types';

/**
 * Render observations table rows as HTML
 */
const renderObservationsTableHTML = (
  observations: Observations,
  specifications: Specifications
): string => {
  const observationRows: Array<{
    parameter: string;
    basic_size: string;
    specMax: string;
    specMin: string;
    wearLimit?: string;
    actual: string;
  }> = [];

  if (observations.go && observations.no_go) {
    const goSpec = specifications.go;
    const noGoSpec = specifications.no_go;

    if (observations.go.a?.average !== undefined || observations.go.b?.average !== undefined) {
      const goAvg = observations.go.a?.average ?? observations.go.b?.average ?? null;
      observationRows.push({
        parameter: 'GO',
        basic_size: goSpec?.basic_size?.toString() ?? '-',
        specMax: goSpec?.specification_limit_max?.toString() ?? '-',
        specMin: goSpec?.specification_limit_min?.toString() ?? '-',
        wearLimit: goSpec?.wear_limit?.toString() ?? '-',
        actual: goAvg?.toFixed(4) ?? '-',
      });
    }

    if (observations.no_go.a?.values || observations.no_go.b?.values) {
      const noGoValues = observations.no_go.a?.values ?? observations.no_go.b?.values ?? [];
      const noGoAvg = noGoValues.length > 0
        ? noGoValues.reduce((sum, val) => sum + val, 0) / noGoValues.length
        : null;
      observationRows.push({
        parameter: 'NO-GO',
        basic_size: noGoSpec?.basic_size?.toString() ?? '-',
        specMax: noGoSpec?.specification_limit_max?.toString() ?? '-',
        specMin: noGoSpec?.specification_limit_min?.toString() ?? '-',
        wearLimit: noGoSpec?.wear_limit?.toString() ?? '-',
        actual: noGoAvg?.toFixed(4) ?? '-',
      });
    }
  } else if (observations.type_a_readings && observations.type_a_readings.length > 0) {
    const avg = observations.type_a_readings.reduce((sum, val) => sum + val, 0) / observations.type_a_readings.length;
    observationRows.push({
      parameter: 'Type A',
      basic_size: specifications.go?.basic_size?.toString() ?? '-',
      specMax: specifications.go?.specification_limit_max?.toString() ?? '-',
      specMin: specifications.go?.specification_limit_min?.toString() ?? '-',
      actual: avg.toFixed(4),
    });
  }

  if (observationRows.length === 0) {
    return `
      <tr>
        <td colspan="6" style="text-align: center; padding: 12px;">No observations available</td>
      </tr>
    `;
  }

  return observationRows
    .map(
      (row) => `
      <tr>
        <td>${row.parameter}</td>
        <td>${row.basic_size}</td>
        <td>${row.specMax}</td>
        <td>${row.specMin}</td>
        <td>${row.wearLimit ?? '-'}</td>
        <td class="actual-col">${row.actual}</td>
      </tr>
    `
    )
    .join('');
};

/**
 * Render equipment masters table as HTML
 */
const renderEquipmentMastersTableHTML = (equipmentMasters: CertificateData['equipment_masters']): string => {
  if (!equipmentMasters || equipmentMasters.length === 0) {
    return '';
  }

  const rows = equipmentMasters
    .map(
      (eq) => `
      <tr>
        <td>${eq.equipment}</td>
        <td>${eq.make}</td>
        <td>${eq.sr_no}</td>
        <td>${eq.cert_no}</td>
        <td>${eq.calibrated}</td>
        <td>${eq.valid_till}</td>
      </tr>
    `
    )
    .join('');

  return `
    <div class="box equipment">
      <div class="title">06. Equipment & Masters used for Calibration</div>
      <div class="table-wrap">
        <table class="equipment-table">
          <thead>
            <tr>
              <th>Equipment</th>
              <th>Make</th>
              <th>Sr No</th>
              <th>Cert No</th>
              <th>Calibrated</th>
              <th>Valid Till</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

/**
 * Generate complete HTML string for certificate
 */
export const generateCertificateHTML = (data: CertificateData): string => {
  const observationsTableRows = renderObservationsTableHTML(data.observations, data.specifications);
  const equipmentTableHTML = renderEquipmentMastersTableHTML(data.equipment_masters);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Calibration Certificate</title>
    <style>
        /* ---------- Global variables ---------- */
        :root {
            --page-w: 210mm;
            --page-h: 297mm;
            --gutter: 8mm;
            --inner-pad: calc(var(--gutter) - 2mm);
            --bg: #FFF;
            --text: #263238;
            --muted: #6B7280;
            --border: #D1D5DB;
            --th-bg: #374151;
            --highlight-start: rgba(255, 243, 205, 0.85);
            --highlight-end: rgba(255, 249, 230, 0.7);
        }

        @page {
            size: A4 portrait;
            margin: 0;
        }

        html, body {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            background: #efefef;
        }

        body {
            font-family: "Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, system-ui, -apple-system, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            color: var(--text);
            line-height: 1.32;
            font-size: 14px;
            padding: 10px;
            display: flex;
            justify-content: center;
        }

        .certificate-container {
            width: calc(var(--page-w) - (var(--gutter) * 2));
            max-width: 100%;
            background: var(--bg);
            margin: 0 auto 8px;
            padding: var(--inner-pad);
            border: 1px solid var(--border);
            border-radius: 3px;
            box-shadow: none;
            color: var(--text);
        }

        .header-img {
            width: calc(100% + var(--inner-pad) + var(--inner-pad));
            margin-left: calc(-1 * var(--inner-pad));
            margin-top: calc(-1 * var(--inner-pad));
            margin-bottom: calc(var(--inner-pad) / 2);
            overflow: hidden;
        }

        .header-img img {
            display: block;
            width: 100%;
            height: auto;
            object-fit: cover;
            border: 0;
        }

        h1.centre-title {
            font-size: 15px;
            margin: 4px 0;
            font-weight: 600;
            text-align: center;
        }

        .top-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 6px;
        }

        .top-table td {
            border: 1px solid var(--border);
            padding: 5px 6px;
            vertical-align: middle;
        }

        .top-table .label {
            background: #F3F4F6;
            width: 110px;
            font-weight: 600;
            color: #111827;
        }

        .two-col {
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 8px;
            margin-bottom: 6px;
        }

        .box {
            border: 1px solid var(--border);
            background: #FBFBFB;
            padding: 6px;
            border-radius: 2px;
            font-size: 11px;
        }

        .box .title {
            font-weight: 700;
            margin-bottom: 6px;
            font-size: 12px;
        }

        .keyval {
            display: flex;
            gap: 6px;
            align-items: flex-start;
            margin: 4px 0;
        }

        .keyval .k {
            width: 95px;
            font-weight: 600;
            color: #334155;
            font-size: 12px;
        }

        .keyval .v {
            flex: 1;
            color: #2B3440;
            font-size: 12px;
        }

        .equipment-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            min-width: 420px;
            font-size: 11px;
        }

        .equipment-table th, .equipment-table td {
            border: 1px solid var(--border);
            padding: 6px 8px;
            vertical-align: top;
            word-break: break-word;
            text-align: left;
        }

        .equipment-table th {
            background: #eee;
            font-weight: 700;
        }

        .table-responsive {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        .obs-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 11px;
            margin-top: 6px;
        }

        .obs-table th, .obs-table td {
            border: 1px solid var(--border);
            padding: 5px 6px;
            vertical-align: middle;
            word-break: break-word;
            white-space: normal;
        }

        .obs-table th {
            background: var(--th-bg);
            color: #F9FAFB;
            font-weight: 600;
            font-size: 11px;
        }

        .actual-col {
            background: linear-gradient(90deg, var(--highlight-start), var(--highlight-end));
            font-weight: 700;
        }

        .details-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11.2px;
            color: var(--text);
        }

        .details-table td {
            border: 1px solid rgba(0, 0, 0, 0.06);
            padding: 6px 8px;
            vertical-align: top;
            line-height: 1.28;
        }

        .details-table td.label {
            width: 34%;
            background: #FAFBFC;
            font-weight: 700;
            color: #333;
            white-space: nowrap;
        }

        .details-table td.value {
            width: 66%;
            color: #2B3440;
            white-space: normal;
        }

        .sign-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-top: 8px;
            align-items: flex-end;
        }

        .sign {
            width: 30%;
            text-align: center;
            font-size: 11px;
        }

        .sign .line {
            margin: 12px auto 6px;
            width: 70%;
            border-top: 1px solid #CBD5E1;
        }

        .footer-note {
            margin-top: 8px;
            font-size: 10px;
            color: var(--muted);
            border-top: 1px dashed #E5E7EB;
            padding-top: 6px;
            text-align: center;
        }

        @media print {
            html, body {
                width: var(--page-w);
                height: var(--page-h);
                margin: 0;
                padding: 0;
                background: #fff;
            }
            body {
                display: block;
                padding: 0;
                font-size: 13px;
                line-height: 1.30;
                -webkit-print-color-adjust: exact;
            }
            .certificate-container {
                width: var(--page-w);
                max-width: none;
                margin: 0;
                padding: 0 6mm 6mm;
                border: none;
                border-radius: 0;
                box-shadow: none;
                min-height: 0;
            }
            .header-img {
                margin-left: -6mm;
                width: calc(100% + 12mm);
                margin-top: 0;
                margin-bottom: 4px;
                overflow: hidden;
            }
            .header-img img {
                display: block;
                width: 100%;
                height: auto;
                object-fit: cover;
                border: 0;
            }
        }
    </style>
</head>
<body>
    <div class="certificate-container">
        <div class="header-img">
            <img src="/images/logo/cheaderSvg.svg" alt="Company Header" onerror="this.style.display='none'" />
        </div>

        <h1 class="centre-title">Calibration Certificate of : <span style="text-transform:capitalize;">${data.description}</span></h1>

        <table class="top-table">
            <tr>
                <td class="label">Date of Calibration</td>
                <td>${data.calibration_date}</td>
                <td class="label">Next Calibration Date</td>
                <td>${data.next_cal_date}</td>
            </tr>
            <tr>
                <td class="label">Calibration Certificate No</td>
                <td>${data.certificate_no}</td>
                <td class="label">Certificate Issue Date</td>
                <td>${data.issue_date}</td>
            </tr>
            <tr>
                <td class="label">ULR No.</td>
                <td>${data.ulr_no || '-'}</td>
                <td class="label">Page No</td>
                <td>${data.page || '1'}</td>
            </tr>
        </table>

        <div class="two-col">
            <div class="box">
                <div class="title">01. Name & Address of Client</div>
                <div class="keyval">
                    <div class="k">Client:</div>
                    <div class="v">${data.client_name}</div>
                </div>
                <div class="keyval">
                    <div class="k">Address:</div>
                    <div class="v">${data.client_address}</div>
                </div>
                <div class="keyval">
                    <div class="k">DC No / DC Date:</div>
                    <div class="v">${data.dc_no} / ${data.dc_date}</div>
                </div>
                <div class="keyval">
                    <div class="k">Date Received:</div>
                    <div class="v">${data.received_date}</div>
                </div>
            </div>

            <div class="box">
                <div class="title">05. Description & Identification</div>
                <div class="keyval">
                    <div class="k">Description:</div>
                    <div class="v">${data.description}</div>
                </div>
                <div class="keyval">
                    <div class="k">Make:</div>
                    <div class="v">${data.make}</div>
                </div>
                <div class="keyval">
                    <div class="k">Sr. No.:</div>
                    <div class="v">${data.serial_number}</div>
                </div>
                <div class="keyval">
                    <div class="k">Specification:</div>
                    <div class="v">${data.specification}</div>
                </div>
                <div class="keyval">
                    <div class="k">Condition of Gauge:</div>
                    <div class="v">${data.condition}</div>
                </div>
                <div class="keyval">
                    <div class="k">VMC ID:</div>
                    <div class="v">${data.vmc_id}</div>
                </div>
            </div>
        </div>

        ${equipmentTableHTML}

        <div class="box">
            <div class="title">07–12. Calibration Details</div>
            <table class="details-table">
                <tbody>
                    <tr>
                        <td class="label">Traceability:</td>
                        <td class="value">${data.traceability}</td>
                    </tr>
                    <tr>
                        <td class="label">Calibration Method:</td>
                        <td class="value">${data.method}</td>
                    </tr>
                    ${data.uncertainty ? `<tr>
                        <td class="label">Uncertainty (k=2):</td>
                        <td class="value">${data.uncertainty}</td>
                    </tr>` : ''}
                    <tr>
                        <td class="label">Location:</td>
                        <td class="value">${data.location}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div style="margin-top:8px;">
            <div class="table-responsive">
                <table class="obs-table">
                    <thead>
                        <tr>
                            <th>Parameter</th>
                            <th>Basic Size</th>
                            <th>Specification Limit Max</th>
                            <th>Specification Limit Min</th>
                            <th>Wear Limit</th>
                            <th>Actual Size</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${observationsTableRows}
                    </tbody>
                </table>
            </div>
        </div>

        ${data.remarks ? `<div class="box" style="margin-top:12px;">
            <div class="title">14. Conformity Statement & Remarks</div>
            <div class="keyval">
                <div class="k">Remark:</div>
                <div class="v">${data.remarks}</div>
            </div>
        </div>` : ''}

        <div class="sign-row">
            <div class="sign">
                <div><strong>Calibrated By</strong></div>
                ${data.calibrated_by ? `<div style="margin-top:6px;">${data.calibrated_by}</div>` : ''}
                <div class="line"></div>
            </div>
            <div class="sign" style="text-align:center;">
                <div><strong>Approved By</strong></div>
                ${data.approved_by ? `<div style="margin-top:6px;">${data.approved_by}</div>` : ''}
                <div class="line"></div>
            </div>
        </div>

        <div class="footer-note">
            <div>This Certificate pertains only to the items calibrated at Vikramaditya Metrology Center LLP. This Calibration Certificate shall not be reproduced except in full, without written approval of the Laboratory.</div>
            <div style="margin-top:6px;"><strong>ULR No.: ${data.ulr_no || '-'} &nbsp;&nbsp; SC/F/47-01</strong></div>
            <div style="margin-top:6px;">---------------- END ----------------</div>
        </div>
    </div>
</body>
</html>`;
};

