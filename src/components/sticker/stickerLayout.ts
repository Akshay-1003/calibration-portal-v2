/**
 * Sticker Layout Schema
 * 
 * This schema defines the layout of sticker elements in millimeters.
 * The same schema is used for both:
 * - React preview rendering (converted to pixels using DPI)
 * - Backend TSPL command generation
 */

export const PRINTER_DPI = 203;

/**
 * Convert millimeters to pixels at 203 DPI
 * Formula: pixels = (mm * DPI) / 25.4
 */
export function mmToPx(mm: number): number {
  return (mm * PRINTER_DPI) / 25.4;
}

/**
 * Convert pixels to millimeters at 203 DPI
 * Formula: mm = (pixels * 25.4) / DPI
 */
export function pxToMm(px: number): number {
  return (px * 25.4) / PRINTER_DPI;
}

/**
 * Text alignment options
 */
export type TextAlign = "left" | "center" | "right";

/**
 * Font weight options
 */
export type FontWeight = "normal" | "bold" | "semibold";

/**
 * Text element definition
 */
export interface TextElement {
  type: "text";
  x: number; // X position in mm
  y: number; // Y position in mm
  width?: number; // Optional width in mm (for text wrapping)
  height?: number; // Optional height in mm
  fontSize: number; // Font size in mm
  fontWeight?: FontWeight;
  align?: TextAlign;
  content: string; // Text content or template variable (e.g., "{vmcId}")
  color?: string; // Hex color (default: #000000)
}

/**
 * Barcode element definition (CODE128)
 */
export interface BarcodeElement {
  type: "barcode";
  x: number; // X position in mm
  y: number; // Y position in mm
  width: number; // Barcode width in mm
  height: number; // Barcode height in mm
  data: string; // Barcode data or template variable (e.g., "{vmcId}")
  format: "CODE128"; // Barcode format
  showText?: boolean; // Show text below barcode (default: false)
  textSize?: number; // Text size in mm if showText is true
}

/**
 * Union type for all layout elements
 */
export type LayoutElement = TextElement | BarcodeElement;

/**
 * Sticker layout definition
 */
export interface StickerLayout {
  width: number; // Sticker width in mm
  height: number; // Sticker height in mm
  elements: LayoutElement[]; // Array of layout elements
}

/**
 * Template data for rendering sticker content
 */
export interface StickerTemplateData {
  vmcId: string;
  gId?: string;
  calDate: string;
  dueDate: string;
  barcodeData?: string; // Data for barcode (usually VMC ID or G.ID)
  barcodeUrl?: string; // URL to barcode image from backend (preferred over generating)
}

/**
 * Default layouts for different sticker sizes
 */
export const DEFAULT_LAYOUTS: Record<string, StickerLayout> = {
  "15x35": {
    width: 35, // Length/Width (horizontal, larger dimension - 35mm)
    height: 15, // Height (vertical, smaller dimension - 15mm) - Landscape orientation
    elements: [
      // VMC ID Label
      {
        type: "text",
        x: 0.5,
        y: 1,
        fontSize: 1.0,
        fontWeight: "bold",
        align: "left",
        content: "VMC ID:",
        color: "#000000",
      },
      // VMC ID Value
      {
        type: "text",
        x: 7.5,
        y: 1,
        fontSize: 1.0,
        fontWeight: "bold",
        align: "left",
        content: "{vmcId}",
        color: "#000000",
      },
      // G.ID Label (if identification is enabled)
      {
        type: "text",
        x: 0.5,
        y: 3.2,
        fontSize: 1.0,
        fontWeight: "bold",
        align: "left",
        content: "G.ID:",
        color: "#000000",
      },
      // G.ID Value
      {
        type: "text",
        x: 7.5,
        y: 3.2,
        fontSize: 1.0,
        fontWeight: "bold",
        align: "left",
        content: "{gId}",
        color: "#000000",
      },
      // Calibration Date
      {
        type: "text",
        x: 0.5,
        y: 5.4,
        fontSize: 1.0,
        fontWeight: "bold",
        align: "left",
        content: "Cal.Dt.:",
        color: "#000000",
      },
      {
        type: "text",
        x: 7.5,
        y: 5.4,
        fontSize: 1.0,
        fontWeight: "bold",
        align: "left",
        content: "{calDate}",
        color: "#000000",
      },
      // Due Date
      {
        type: "text",
        x: 0.5,
        y: 7.6,
        fontSize: 1.0,
        fontWeight: "bold",
        align: "left",
        content: "Due.Dt.:",
        color: "#000000",
      },
      {
        type: "text",
        x: 7.5,
        y: 7.6,
        fontSize: 1.0,
        fontWeight: "bold",
        align: "left",
        content: "{dueDate}",
        color: "#000000",
      },
      // Barcode (if enabled) - positioned at right side
      {
        type: "barcode",
        x: 19,
        y: 1.5,
        width: 14,
        height: 11,
        data: "{barcodeData}",
        format: "CODE128",
        showText: false,
      },
    ],
  },
  "20x40": {
    width: 20, // Width (horizontal, smaller dimension)
    height: 40, // Height (vertical, larger dimension) - Portrait orientation
    elements: [
      // VMC ID Label
      {
        type: "text",
        x: 1.5,
        y: 1.5,
        fontSize: 2,
        fontWeight: "bold",
        align: "left",
        content: "VMC ID:",
        color: "#666666",
      },
      // VMC ID Value
      {
        type: "text",
        x: 1.5,
        y: 4,
        fontSize: 2.5,
        fontWeight: "bold",
        align: "left",
        content: "{vmcId}",
        color: "#000000",
      },
      // G.ID Label
      {
        type: "text",
        x: 1.5,
        y: 7.5,
        fontSize: 2,
        fontWeight: "bold",
        align: "left",
        content: "G.ID:",
        color: "#666666",
      },
      // G.ID Value
      {
        type: "text",
        x: 1.5,
        y: 10,
        fontSize: 2.5,
        fontWeight: "bold",
        align: "left",
        content: "{gId}",
        color: "#000000",
      },
      // Calibration Date
      {
        type: "text",
        x: 1.5,
        y: 13.5,
        fontSize: 1.5,
        fontWeight: "semibold",
        align: "left",
        content: "Cal.Dt.:",
        color: "#666666",
      },
      {
        type: "text",
        x: 12,
        y: 13.5,
        fontSize: 1.5,
        fontWeight: "bold",
        align: "right",
        content: "{calDate}",
        color: "#000000",
      },
      // Due Date
      {
        type: "text",
        x: 1.5,
        y: 16,
        fontSize: 1.5,
        fontWeight: "semibold",
        align: "left",
        content: "Due.Dt.:",
        color: "#666666",
      },
      {
        type: "text",
        x: 12,
        y: 16,
        fontSize: 1.5,
        fontWeight: "bold",
        align: "right",
        content: "{dueDate}",
        color: "#000000",
      },
      // Barcode
      {
        type: "barcode",
        x: 1.5,
        y: 19,
        width: 17,
        height: 10,
        data: "{barcodeData}",
        format: "CODE128",
        showText: false,
      },
    ],
  },
  "25x50": {
    width: 25, // Width (horizontal, smaller dimension)
    height: 50, // Height (vertical, larger dimension) - Portrait orientation
    elements: [
      // VMC ID Label
      {
        type: "text",
        x: 2,
        y: 2,
        fontSize: 2.5,
        fontWeight: "semibold",
        align: "left",
        content: "VMC ID:",
        color: "#666666",
      },
      // VMC ID Value
      {
        type: "text",
        x: 2,
        y: 5,
        fontSize: 3,
        fontWeight: "bold",
        align: "left",
        content: "{vmcId}",
        color: "#000000",
      },
      // G.ID Label
      {
        type: "text",
        x: 2,
        y: 9,
        fontSize: 2.5,
        fontWeight: "semibold",
        align: "left",
        content: "G.ID:",
        color: "#666666",
      },
      // G.ID Value
      {
        type: "text",
        x: 2,
        y: 12,
        fontSize: 3,
        fontWeight: "bold",
        align: "left",
        content: "{gId}",
        color: "#000000",
      },
      // Calibration Date
      {
        type: "text",
        x: 2,
        y: 17,
        fontSize: 2,
        fontWeight: "semibold",
        align: "left",
        content: "Cal.Dt.:",
        color: "#666666",
      },
      {
        type: "text",
        x: 18,
        y: 17,
        fontSize: 2,
        fontWeight: "bold",
        align: "right",
        content: "{calDate}",
        color: "#000000",
      },
      // Due Date
      {
        type: "text",
        x: 2,
        y: 20,
        fontSize: 2,
        fontWeight: "semibold",
        align: "left",
        content: "Due.Dt.:",
        color: "#666666",
      },
      {
        type: "text",
        x: 18,
        y: 20,
        fontSize: 2,
        fontWeight: "bold",
        align: "right",
        content: "{dueDate}",
        color: "#000000",
      },
      // Barcode
      {
        type: "barcode",
        x: 2,
        y: 24,
        width: 21,
        height: 12,
        data: "{barcodeData}",
        format: "CODE128",
        showText: false,
      },
    ],
  },
  "30x60": {
    width: 30, // Width (horizontal, smaller dimension)
    height: 60, // Height (vertical, larger dimension) - Portrait orientation
    elements: [
      // VMC ID Label
      {
        type: "text",
        x: 2.5,
        y: 2.5,
        fontSize: 3,
        fontWeight: "semibold",
        align: "left",
        content: "VMC ID:",
        color: "#666666",
      },
      // VMC ID Value
      {
        type: "text",
        x: 2.5,
        y: 6,
        fontSize: 3.5,
        fontWeight: "bold",
        align: "left",
        content: "{vmcId}",
        color: "#000000",
      },
      // G.ID Label
      {
        type: "text",
        x: 2.5,
        y: 11,
        fontSize: 3,
        fontWeight: "semibold",
        align: "left",
        content: "G.ID:",
        color: "#666666",
      },
      // G.ID Value
      {
        type: "text",
        x: 2.5,
        y: 14.5,
        fontSize: 3.5,
        fontWeight: "bold",
        align: "left",
        content: "{gId}",
        color: "#000000",
      },
      // Calibration Date
      {
        type: "text",
        x: 2.5,
        y: 20,
        fontSize: 2.5,
        fontWeight: "semibold",
        align: "left",
        content: "Cal.Dt.:",
        color: "#666666",
      },
      {
        type: "text",
        x: 22,
        y: 20,
        fontSize: 2.5,
        fontWeight: "bold",
        align: "right",
        content: "{calDate}",
        color: "#000000",
      },
      // Due Date
      {
        type: "text",
        x: 2.5,
        y: 24,
        fontSize: 2.5,
        fontWeight: "semibold",
        align: "left",
        content: "Due.Dt.:",
        color: "#666666",
      },
      {
        type: "text",
        x: 22,
        y: 24,
        fontSize: 2.5,
        fontWeight: "bold",
        align: "right",
        content: "{dueDate}",
        color: "#000000",
      },
      // Barcode
      {
        type: "barcode",
        x: 2.5,
        y: 29,
        width: 25,
        height: 15,
        data: "{barcodeData}",
        format: "CODE128",
        showText: false,
      },
    ],
  },
};

/**
 * Replace template variables in content with actual data
 */
export function renderTemplate(
  template: string,
  data: StickerTemplateData
): string {
  return template
    .replace(/{vmcId}/g, data.vmcId || "")
    .replace(/{gId}/g, data.gId || "-")
    .replace(/{calDate}/g, data.calDate || "")
    .replace(/{dueDate}/g, data.dueDate || "")
    .replace(/{barcodeData}/g, data.barcodeData || data.vmcId || "");
}

