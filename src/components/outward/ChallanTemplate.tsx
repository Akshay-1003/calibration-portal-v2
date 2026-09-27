import React from "react";

// Type definitions for Challan data
export interface ChallanItem {
  sr_no: number;
  gauge_name: string;
  identification_number: string;
  lab_id: string;
  dc_no?: string;
  dc_date?: string;
  specification: string;
  qty: number;
}

export interface ChallanData {
  // Company Information
  company_name: string;
  company_address: string;
  company_contact: string;
  company_email: string;
  
  // Challan Information
  challan_number: string;
  challan_date: string;
  outward_no: string;
  outward_date: string;
  transport_by: string;
  total_gauge_qty: number;
  
  // Recipient Information
  recipient_name: string;
  recipient_address: string;
  
  // Items
  items: ChallanItem[];
  
  // Logo URL (optional)
  logo_url?: string;
}

interface ChallanTemplateProps {
  data: ChallanData;
  className?: string;
}

export const ChallanTemplate: React.FC<ChallanTemplateProps> = ({ data, className = "" }) => {
  return (
    <div
      className={`bg-white text-black p-6 md:p-8 print:p-6 ${className}`}
      id="challan-template"
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 print:mb-4">
        {/* Left Side - Company Info */}
        <div className="flex-1 mb-4 md:mb-0">
          {/* Logo */}
          {data.logo_url && (
            <div className="mb-3">
              <img
                src={data.logo_url}
                alt="Company Logo"
                className="h-12 md:h-16 object-contain"
                onError={(e) => {
                  // Hide logo if it fails to load
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
          
          <h1 className="text-xl md:text-2xl font-bold uppercase mb-2">
            {data.company_name}
          </h1>
          <p className="text-xs md:text-sm text-gray-700 mb-1">
            {data.company_address}
          </p>
          <p className="text-xs md:text-sm text-gray-700 mb-1">
            Contact: {data.company_contact}
          </p>
          <p className="text-xs md:text-sm text-gray-700">
            Email: {data.company_email}
          </p>
        </div>

        {/* Right Side - Challan Title & Number */}
        <div className="text-right">
          <h2 className="text-2xl md:text-3xl font-bold uppercase mb-2">
            OUTWARD CHALAN
          </h2>
          <p className="text-3xl md:text-4xl font-bold">
            {data.challan_number}
          </p>
        </div>
      </div>

      {/* Recipient Information */}
      <div className="mb-4 print:mb-3">
        <p className="text-sm font-semibold mb-1">Deliver To,</p>
        <p className="text-sm font-semibold mb-1">{data.recipient_name}</p>
        <p className="text-xs text-gray-700">{data.recipient_address}</p>
      </div>

      {/* Challan Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 print:mb-4 p-3 bg-gray-50 rounded print:bg-transparent print:p-2">
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1">Outward No:</p>
          <p className="text-sm font-semibold">{data.outward_no}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1">Outward Date:</p>
          <p className="text-sm font-semibold">{data.outward_date}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1">Transport By:</p>
          <p className="text-sm font-semibold">{data.transport_by}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1">Gauge Qty (Total):</p>
          <p className="text-sm font-semibold">{data.total_gauge_qty}</p>
        </div>
      </div>

      {/* Main Items Table */}
      <div className="mb-6 print:mb-4 overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100 print:bg-gray-200">
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-xs uppercase">
                S/R
              </th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-xs uppercase">
                gauge Name
              </th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-xs uppercase">
                Indentification No.
              </th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-xs uppercase">
                LAB ID
              </th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-xs uppercase">
                DC No./DC Date
              </th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-xs uppercase">
                Specification
              </th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-xs uppercase">
                Qty
              </th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50 print:hover:bg-transparent">
                <td className="border border-gray-300 px-3 py-2">{item.sr_no}</td>
                <td className="border border-gray-300 px-3 py-2">{item.gauge_name}</td>
                <td className="border border-gray-300 px-3 py-2">
                  {item.identification_number || "-"}
                </td>
                <td className="border border-gray-300 px-3 py-2">{item.lab_id}</td>
                <td className="border border-gray-300 px-3 py-2">
                  {item.dc_no && item.dc_date
                    ? `${item.dc_no}, ${item.dc_date}`
                    : item.dc_no || item.dc_date || "-"}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs">
                  {item.specification}
                </td>
                <td className="border border-gray-300 px-3 py-2">{item.qty}</td>
              </tr>
            ))}
            {/* Total Row */}
            <tr className="bg-gray-50 print:bg-gray-100 font-semibold">
              <td
                colSpan={6}
                className="border border-gray-300 px-3 py-2 text-right"
              >
                Total Qty
              </td>
              <td className="border border-gray-300 px-3 py-2">
                {data.total_gauge_qty}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:gap-4 mt-8 print:mt-6">
        {/* Left - Receiver Information */}
        <div className="col-span-1">
          <div className="space-y-3 print:space-y-2">
            <div>
              <p className="text-xs font-semibold mb-1">Receiver Name:</p>
              <div className="border-b-2 border-gray-400 h-6"></div>
            </div>
            <div>
              <p className="text-xs font-semibold mb-1">Contact Num.</p>
              <div className="border-b-2 border-gray-400 h-6"></div>
            </div>
            <div>
              <p className="text-xs font-semibold mb-1">Signatory</p>
              <div className="border-b-2 border-gray-400 h-6"></div>
            </div>
          </div>
        </div>

        {/* Center - Empty space or additional info */}
        <div className="col-span-1"></div>

        {/* Right - Sender Signature */}
        <div className="col-span-1 text-right">
          <p className="text-sm font-semibold mb-2">
            For {data.company_name.split(" ")[0]} {data.company_name.split(" ").slice(1).join(" ")}
          </p>
          <p className="text-xs text-gray-600">Authorised Signatory</p>
        </div>
      </div>
    </div>
  );
};

