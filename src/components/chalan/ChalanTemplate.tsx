import React from "react";
import "../../styles/chalan-print.css";
import { formatSpecificationForPrint } from "../../utils/specificationPrintFormatter";

// Type definitions for Chalan data
export interface ChalanItem {
  sr_no: number;
  gauge_name: string;
  identification_number: string;
  lab_id: string;
  dc_no?: string;
  dc_date?: string;
  specification: unknown; // Changed to unknown to support object/array specifications
  qty: number;
  unit?: string; // Optional unit for measurements
}

export interface ChalanData {
  // Company/Sender Information
  company_name: string;
  company_address: string;
  company_contact: string;
  company_email: string;
  company_logo?: string;

  // Chalan Information
  chalan_number: string;
  chalan_date: string;
  outward_no: string;
  outward_date: string;
  transport_by: string;
  total_qty: number;

  // Recipient Information
  recipient_name: string;
  recipient_address: string;

  // Items
  items: ChalanItem[];

  // Footer Information
  receiver_name?: string;
  receiver_contact?: string;
  receiver_signatory?: string;
}

interface ChalanTemplateProps {
  data: ChalanData;
  className?: string;
}

export const ChalanTemplate: React.FC<ChalanTemplateProps> = ({ data, className = "" }) => {
  const formatDate = (date?: string) => {
    if (!date) return "-";
    const d = new Date(date);
    return isNaN(d.getTime())
      ? date
      : d.toLocaleDateString("en-GB");
  };

  return (
    <div className={`chalan-print ${className}`}>

      {/* ================= HEADER ================= */}
      <div className="chalan-header">
        <div className="company-info">
          {/* {data.company_logo && (
            <img src={data.company_logo} className="company-logo" />
          )} */}
          <h1>{data.company_name}</h1>
          <p>{data.company_address}</p>
          <p>Contact: {data.company_contact}</p>
          <p>Email: {data.company_email}</p>
        </div>

        
      </div>

      {/* ================= RECIPIENT ================= */}
      <div className="recipient">
        <div className="chalan-title">Outward Challan : <span>{data.outward_no}</span></div>
        <strong>Deliver To,</strong>
        <div className="recipient-name">{data.recipient_name}</div>
        <div>{data.recipient_address}</div>
      </div>

      {/* ================= SUMMARY ================= */}
      <div className="summary">
        <div><label>Outward No</label><span>{data.outward_no}</span></div>
        <div><label>Outward Date</label><span>{formatDate(data.outward_date)}</span></div>
        <div><label>Transport By</label><span>{data.transport_by || "-"}</span></div>
        <div><label>Total Qty</label><span>{data.total_qty}</span></div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="table-container">
        <table className="items-table">
          <thead>
            <tr>
              <th style={{ width: "4%" }}>S/R</th>
              <th style={{ width: "18%" }}>Gauge Name</th>
              <th style={{ width: "16%" }}>Identification No</th>
              <th style={{ width: "12%" }}>LAB ID</th>
              <th style={{ width: "14%" }}>DC No / Date</th>
              <th style={{ width: "30%" }}>Specification</th>
              <th style={{ width: "6%" }}>Qty</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => {
              const specificationText = formatSpecificationForPrint(item.specification, item.unit || "mm");

              return (
                <tr key={i} className="table-row">
                  <td>{item.sr_no}</td>
                  <td>{item.gauge_name}</td>
                  <td>{item.identification_number || "-"}</td>
                  <td>{item.lab_id}</td>
                  <td>
                    {item.dc_no || item.dc_date
                      ? `${item.dc_no || ""}${item.dc_date ? `, ${formatDate(item.dc_date)}` : ""}`
                      : "-"}
                  </td>
                  <td className="wrap specification-cell" title={specificationText}>
                    {specificationText}
                  </td>
                  <td>{item.qty}</td>
                </tr>
              );
            })}
            <tr className="total-row">
              <td colSpan={6} className="right">Total Qty</td>
              <td>{data.total_qty}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Page counter for print */}
      <div className="page-info">
        <span className="page-number"></span>
      </div>

      {/* ================= FOOTER ================= */}
      <div className="footer">
        <div>
          <p>Receiver Name: ______________________</p>
          <p>Contact No.: ________________________</p>
          <p>Signatory: __________________________</p>
        </div>

        <div className="auth-sign">
          <strong>For {data.company_name}</strong>
          <div>Authorised Signatory</div>
        </div>
      </div>
    </div>
  );
};
