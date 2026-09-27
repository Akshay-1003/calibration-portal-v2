"use client";
import type {
  StickerLayout,
  StickerTemplateData,
  TextElement,
  BarcodeElement,
} from "./stickerLayout";
import { mmToPx, renderTemplate } from "./stickerLayout";

interface StickerPreviewRendererProps {
  layout: StickerLayout;
  data: StickerTemplateData;
  barcodeUrl?: string; // Barcode image URL from API
  className?: string;
}

/**
 * Pixel-accurate sticker preview renderer
 * Uses absolute positioning based on layout schema in millimeters
 * Barcode is rendered from API image URL, not generated on frontend
 */
export function StickerPreviewRenderer({
  layout,
  data,
  barcodeUrl,
  className = "",
}: StickerPreviewRendererProps) {
  // Convert layout dimensions from mm to px
  const widthPx = mmToPx(layout.width);
  const baseHeightPx = mmToPx(layout.height);
  
  // Calculate actual height needed based on content
  const paddingPx = mmToPx(0.5);
  let maxY = 0;
  
  layout.elements.forEach((element) => {
    if (element.type === "text") {
      const content = renderTemplate(element.content, data);
      if (!content || content === "-") return;
      const yPx = mmToPx(element.y) + paddingPx;
      const fontSizePx = mmToPx(element.fontSize);
      const elementHeight = fontSizePx * 1.1;
      maxY = Math.max(maxY, yPx + elementHeight);
    } else if (element.type === "barcode" && barcodeUrl) {
      const yPx = mmToPx(element.y) + paddingPx;
      const heightPx = mmToPx(element.height);
      maxY = Math.max(maxY, yPx + heightPx);
    }
  });
  
  // Use actual content height or base height, whichever is larger
  const heightPx = Math.max(baseHeightPx, maxY + paddingPx * 2);

  // Render text element
  const renderTextElement = (element: TextElement) => {
    const content = renderTemplate(element.content, data);
    if (!content || content === "-") return null;

    // Account for padding (0.5mm) when positioning elements
    const paddingPx = mmToPx(0.5);
    const xPx = mmToPx(element.x) + paddingPx;
    const yPx = mmToPx(element.y) + paddingPx;
    const fontSizePx = mmToPx(element.fontSize);
    const widthPx = element.width ? mmToPx(element.width) : undefined;
    const heightPx = element.height ? mmToPx(element.height) : undefined;

    // Map font weight
    const fontWeightMap: Record<string, string> = {
      normal: "400",
      semibold: "600",
      bold: "700",
    };

    const fontWeight = element.fontWeight
      ? fontWeightMap[element.fontWeight] || "400"
      : "400";

    // Map text align
    const textAlign = element.align || "left";

    return (
      <div
        key={`text-${element.x}-${element.y}-${element.content}`}
        style={{
          position: "absolute",
          left: `${xPx}px`,
          top: `${yPx}px`,
          width: widthPx ? `${widthPx}px` : "auto",
          height: heightPx ? `${heightPx}px` : "auto",
          fontSize: `${fontSizePx}px`,
          fontWeight,
          color: element.color || "#000000",
          textAlign,
          lineHeight: 1.1,
          fontFamily: "Arial, sans-serif",
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        {content}
      </div>
    );
  };

  // Render barcode element from API image URL
  const renderBarcodeElement = (element: BarcodeElement, index: number) => {
    // Use barcode URL from API if available
    if (!barcodeUrl) return null;

    // Account for padding (0.5mm) when positioning elements
    const paddingPx = mmToPx(0.5);
    const xPx = mmToPx(element.x) + paddingPx;
    const yPx = mmToPx(element.y) + paddingPx;
    const widthPx = mmToPx(element.width);
    const heightPx = mmToPx(element.height);

    return (
      <img
        key={`barcode-${index}`}
        src={barcodeUrl}
        alt="Barcode"
        style={{
          position: "absolute",
          left: `${xPx}px`,
          top: `${yPx}px`,
          width: `${widthPx}px`,
          height: `${heightPx}px`,
          objectFit: "contain",
          imageRendering: "crisp-edges", // Keep barcode sharp
        }}
      />
    );
  };

  return (
    <div
      className={`relative bg-white border border-gray-300 rounded-sm ${className}`}
      style={{
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        minWidth: `${widthPx}px`,
        minHeight: `${heightPx}px`,
        boxSizing: "border-box",
        padding: `${mmToPx(0.5)}px`, // Slight padding (0.5mm)
      }}
    >
      {layout.elements.map((element, index) => {
        if (element.type === "text") {
          return renderTextElement(element as TextElement);
        } else if (element.type === "barcode") {
          return renderBarcodeElement(element as BarcodeElement, index);
        }
        return null;
      })}
    </div>
  );
}

