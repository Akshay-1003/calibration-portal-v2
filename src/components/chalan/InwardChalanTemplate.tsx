import React from "react";
import "../../styles/chalan-print.css";
import { formatSpecificationForPrint, formatLabIdForPrint } from "../../utils/specificationPrintFormatter";

// Type definitions for Inward Chalan data
export interface InwardChalanItem {
  sr_no: number;
  gauge_name: string;
  identification_number: string;
  serial_no: string;
  cal_freq: string;
  frequency: string; // Frequency in readable format (e.g., "6 mos.")
  specification: unknown; // Changed from string to unknown to support dynamic specifications
  unit?: string; // Unit for measurements (mm, inch, cm, m) - defaults to 'mm'
  calibration_done_under: string;
  lab_id: string;
}

export interface InwardChalanData {
  // Company/Sender Information
  company_name: string;
  company_address: string;
  company_contact: string;
  company_email: string;
  company_logo?: string;

  // Chalan Information
  inward_chalan_number: string;
  chalan_date: string;
  inward_no: string;
  client_dc_no: string;
  client_dc_date: string;
  gauge_qty: number;

  // Bill To / Deliver To Information (same for both)
  client_name: string;
  client_address: string;
  contact_person: string;
  contact_number: string;

  // Items
  items: InwardChalanItem[];

  // Optional print-only metadata (falls back to defaults if missing)
  calibration_method?: string;
  reporting_method?: string;
  compliance_statement?: string;
  dispatch_mode?: string;
  specific_requirement?: string;
  delivery_commitment_date?: string;
  statement_of_conformity_required?: string;
  decision_rule_discussed?: string;
  accepted_decision_rule_lines?: string[];
  commercial_terms_note?: string;
  customer_authorized_person_name?: string;
  customer_authorized_person_contact?: string;
  lab_authorized_person_name?: string;
  lab_authorized_person_designation?: string;
  form_revision?: string;
}

interface InwardChalanTemplateProps {
  data: InwardChalanData;
  className?: string;
}

export const InwardChalanTemplate: React.FC<InwardChalanTemplateProps> = ({ data, className = "" }) => {
  const formatDate = (date?: string) => {
    if (!date) return "-";
    const d = new Date(date);
    return isNaN(d.getTime())
      ? date
      : d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const acceptedDecisionRules = data.accepted_decision_rule_lines ?? [
    "1) If the Observed size, plus or minus (+/-) the Uncertainty, is within specified limit then the Gauge is OK.",
    "2) If the Observed size, plus (+) or minus (-) the Uncertainty, is Out of specified limit then the Gauge is Not OK.",
  ];

  return (
    <div className={`chalan-print ${className}`}>
      <div style={{ width: "100%", color: "#000", fontFamily: "Arial, Helvetica, sans-serif" }}>
        {/* ================= HEADER ================= */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: "20px",
            alignItems: "start",
            marginBottom: "16px",
          }}
        >
          <div>
            {/* {data.company_logo && (
              <img src={data.company_logo} className="company-logo" alt="Company Logo" />
            )} */}
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 800, lineHeight: 1.1 }}>
              {data.company_name}
            </h1>
            <p style={{ margin: "4px 0 0 0", fontSize: "11px", lineHeight: 1.35 }}>{data.company_address}</p>
            <p style={{ margin: 0, fontSize: "11px", lineHeight: 1.3 }}>Contact: {data.company_contact}</p>
            <p style={{ margin: 0, fontSize: "11px", lineHeight: 1.3 }}>Email: {data.company_email}</p>
          </div>
          <div style={{ textAlign: "center", alignSelf: "center" }}>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, lineHeight: 1.2 }}>
              Customer- Service Request Form
            </h2>
            <div style={{ marginTop: "6px", fontSize: "17px", fontWeight: 800 }}>
              (INWARD CHALAN : {data.inward_chalan_number})
            </div>
          </div>
        </div>

        {/* ================= BILL TO / DELIVER TO ================= */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "16px",
            marginBottom: "14px",
            fontSize: "12px",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, marginBottom: "4px" }}>BILL TO</div>
            <div style={{ fontWeight: 700, textTransform: "uppercase" }}>{data.client_name}</div>
            <div>{data.client_address || "-"}</div>
            <div>-</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: "4px" }}>DELIVER TO</div>
            <div style={{ fontWeight: 700, textTransform: "uppercase" }}>{data.client_name}</div>
            <div>{data.client_address || "-"}</div>
            <div>-</div>
          </div>
          {/* <div>
            <div style={{ fontWeight: 700, textTransform: "uppercase" }}>{data.client_name}</div>
            <div>{data.client_address || "-"}</div>
            <div>-</div>
          </div> */}
        </div>

        {/* ================= SUMMARY ================= */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "10px",
            fontSize: "12px",
          }}
        >
          <thead>
            <tr>
              {["INWARD NO", "Chalan Date", "Client DC No", "Client DC Date", "Gauge Qty"].map((head) => (
                <th
                  key={head}
                  style={{
                    border: "1px solid #888",
                    padding: "4px 6px",
                    fontWeight: 700,
                    textAlign: "center",
                    background: "#f3f3f3",
                  }}
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #888", padding: "4px 6px", textAlign: "center" }}>{data.inward_no || "-"}</td>
              <td style={{ border: "1px solid #888", padding: "4px 6px", textAlign: "center" }}>{formatDate(data.chalan_date)}</td>
              <td style={{ border: "1px solid #888", padding: "4px 6px", textAlign: "center" }}>{data.client_dc_no || "-"}</td>
              <td style={{ border: "1px solid #888", padding: "4px 6px", textAlign: "center" }}>{formatDate(data.client_dc_date)}</td>
              <td style={{ border: "1px solid #888", padding: "4px 6px", textAlign: "center" }}>{data.gauge_qty}</td>
            </tr>
          </tbody>
        </table>

        {/* ================= ITEM TABLE ================= */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "10px",
            fontSize: "11px",
            tableLayout: "fixed",
          }}
        >
          <thead>
            <tr>
                   {[
                { key: "sr", label: "S/R", width: "4%" },
                { key: "name", label: "Gauge Name", width: "18%" },
                { key: "id", label: "Identification", width: "20%" },
                { key: "serial", label: "Serial No.", width: "11%" },
                { key: "freq", label: "Cal. Freq.", width: "8%" },
                { key: "spec", label: "Specification", width: "20%" },
                { key: "done", label: "Cal. Under", width: "8%" },
                { key: "lab", label: "Lab ID", width: "13%" },
              ].map((head) => (
                <th
                  key={head.key}
                  style={{
                    border: "1px solid #888",
                    padding: "5px 4px",
                    textAlign: "center",
                    fontWeight: 700,
                    width: head.width,
                    background: "#f3f3f3",
                  }}
                >
                  {head.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i}>
                <td style={{ border: "1px solid #888", textAlign: "center", padding: "4px" }}>{item.sr_no}</td>
                <td style={{ border: "1px solid #888", padding: "4px" }}>{item.gauge_name || "-"}</td>
                <td style={{ border: "1px solid #888", padding: "4px" }}>{item.identification_number || "-"}</td>
                <td style={{ border: "1px solid #888", padding: "4px", textAlign: "center" }}>{item.serial_no || "-"}</td>
                <td style={{ border: "1px solid #888", padding: "4px", textAlign: "center" }}>
                  {item.frequency || item.cal_freq || "-"}
                </td>
                <td style={{ border: "1px solid #888", padding: "4px", textAlign: "center" }}>
                  {formatSpecificationForPrint(item.specification, item.unit || "mm")}
                </td>
                <td style={{ border: "1px solid #888", padding: "4px", textAlign: "center", textTransform: "uppercase" }}>
                  {item.calibration_done_under || "-"}
                </td>
                <td
                  style={{
                    border: "1px solid #888",
                    padding: "4px",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontSize: "10px",
                  }}
                  title={formatLabIdForPrint(item.lab_id)}
                >
                  {formatLabIdForPrint(item.lab_id)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ================= METHOD TABLES ================= */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px", fontSize: "11px" }}>
          <thead>
            <tr>
              {["Calibration Method to be used", "Method of Reporting", "Compliance Statment"].map((head) => (
                <th
                  key={head}
                  style={{ border: "1px solid #888", padding: "4px", textAlign: "center", fontWeight: 700, background: "#f3f3f3" }}
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #888", padding: "4px", textAlign: "center" }}>
                {data.calibration_method || "Lab Method"}
              </td>
              <td style={{ border: "1px solid #888", padding: "4px", textAlign: "center" }}>
                {data.reporting_method || "Lab Format"}
              </td>
              <td style={{ border: "1px solid #888", padding: "4px", textAlign: "center" }}>
                {data.compliance_statement || "Not Required"}
              </td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "14px", fontSize: "11px" }}>
          <thead>
            <tr>
              {["Mode of Dispatch/Collection", "Any Specific Requrment", "Delivery Commitment (Date)"].map((head) => (
                <th
                  key={head}
                  style={{ border: "1px solid #888", padding: "4px", textAlign: "center", fontWeight: 700, background: "#f3f3f3" }}
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #888", padding: "4px", textAlign: "center" }}>
                {data.dispatch_mode || "By hand"}
              </td>
              <td style={{ border: "1px solid #888", padding: "4px", textAlign: "center" }}>
                {data.specific_requirement || "-"}
              </td>
              <td style={{ border: "1px solid #888", padding: "4px", textAlign: "center" }}>
                {formatDate(data.delivery_commitment_date)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ================= COMPLIANCE STATEMENT ================= */}
        <div style={{ fontSize: "11px", lineHeight: 1.35, marginBottom: "14px" }}>
          <p style={{ margin: "0 0 6px 0" }}>
            Statement of conformity (Compliance Statement with Decision Rule) Required or not :
            {" "}
            {data.statement_of_conformity_required || "NO"}
          </p>
          <p style={{ margin: "0 0 6px 0" }}>
            If yes Decision Rule is discussed, understand & acceptable or not :
            {" "}
            {data.decision_rule_discussed || "NO"}
          </p>
          <p style={{ margin: "0 0 4px 0" }}>Accepted Decision Rule:</p>
          {acceptedDecisionRules.map((line, idx) => (
            <p key={idx} style={{ margin: "0 0 2px 0" }}>
              {line}
            </p>
          ))}
          <p style={{ margin: "8px 0 0 0" }}>
            {data.commercial_terms_note ||
              "*All commercial terms & conditions are accepted as per Quotation / Letter / P.O. No. mentioned above, & this service request form"}
          </p>
        </div>

        {/* ================= SIGNATURE BLOCK ================= */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px", fontSize: "11px" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #888", padding: "5px", textAlign: "center", width: "50%", background: "#f3f3f3" }}>
                Customer Authorized Person
              </th>
              <th style={{ border: "1px solid #888", padding: "5px", textAlign: "center", width: "50%", background: "#f3f3f3" }}>
                Above all requirement reviewed and verified by Lab Authorized Person
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #888", padding: "5px" }}>
                Name : {data.customer_authorized_person_name || "-"}
              </td>
              <td style={{ border: "1px solid #888", padding: "5px" }}>
                Name : {data.lab_authorized_person_name || "Mr. Rohit Patil"}
              </td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #888", padding: "5px" }}>
                Contact Number : {data.customer_authorized_person_contact || "-"}
              </td>
              <td style={{ border: "1px solid #888", padding: "5px" }}>
                Designation : {data.lab_authorized_person_designation || "TECHNICAL MANAGER"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ================= REVISION FOOTER ================= */}
        <div style={{ textAlign: "right", marginTop: "10px", fontSize: "10px", fontWeight: 500 }}>
          {data.form_revision || "VMC/F/10 Rev.-01 Dt.10-10-2024"}
        </div>
      </div>
    </div>
  );
};
