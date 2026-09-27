/**
 * Direct print utility for Gauge Stickers
 * Opens print window with sticker data
 * Optimized for 78mm thermal roll printer with 2-column layout
 * Sticker size: 35mm × 15mm
 */

import React from "react";
import { createRoot, Root } from "react-dom/client";
import { StickerPrintTemplate } from "../components/sticker/StickerPrintTemplate";
import { STICKER_PRINT_STYLES } from "../components/sticker/stickerPrintStyles";
import type { SimpleStickerSettings } from "../components/sticker/StickerSettingsSimpleModal";

export interface StickerPrintData {
  lab_id: string;
  identification_number?: string;
  manf_serial_number?: string;
  calibration_date: string;
  calibration_due_date: string;
  barcode_url?: string;
  barcode_data?: string;
}

/**
 * Open print window with sticker data
 * Layout: 2 columns, 78mm roll width, 3.5mm margins
 * Sticker size: 35mm × 15mm
 */
export const printStickers = (
  stickersData: StickerPrintData[],
  settings: SimpleStickerSettings
): void => {
  if (!stickersData || stickersData.length === 0) {
    throw new Error("No sticker data provided");
  }

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    throw new Error("Please allow popups to print stickers");
  }

  const doc = printWindow.document;
  
  // Set HTML structure
  doc.documentElement.innerHTML = '<head></head><body></body>';
  
  const head = doc.head;
  const body = doc.body;
  
  // Set document title
  const title = doc.createElement('title');
  title.textContent = 'Gauge Stickers - Print';
  head.appendChild(title);
  
  // Set charset
  const meta = doc.createElement('meta');
  meta.setAttribute('charset', 'utf-8');
  head.appendChild(meta);
  
  // Add viewport
  const viewport = doc.createElement('meta');
  viewport.setAttribute('name', 'viewport');
  viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
  head.appendChild(viewport);
  
  // Create style element
  const style = doc.createElement('style');
  style.textContent = `
    /* Page setup for exact 78mm thermal roll alignment */
    @page {
      size: 78mm auto;
      margin: 0 !important;
    }

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 78mm !important;
      max-width: 78mm !important;
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #fff;
      box-sizing: border-box;
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    /* Shared sticker print styles */
    ${STICKER_PRINT_STYLES}

    /* Print window specific */
    @media print {
      body {
        padding: 0 !important;
        margin: 0 !important;
        background: #fff;
      }
    }
  `;
  head.appendChild(style);
  
  // Create temporary container in current document to render React component
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.style.top = '-9999px';
  document.body.appendChild(tempContainer);
  
  // Render React component in temporary container
  const root: Root = createRoot(tempContainer);
  root.render(React.createElement(StickerPrintTemplate, { stickersData, settings }));
  
  // Wait for React to render, then clone and move to print window
  setTimeout(() => {
    const stickerElement = tempContainer.querySelector('.sticker-print-container') as HTMLElement;
    if (!stickerElement) {
      console.error('Failed to render sticker template');
      tempContainer.remove();
      root.unmount();
      printWindow.close();
      return;
    }
    
    // Clone the content
    const content = stickerElement.cloneNode(true) as HTMLElement;
    
    // Clean up temporary container
    tempContainer.remove();
    root.unmount();
    
    // Wait for images/barcodes to load
    const images = content.querySelectorAll('img');
    const imagePromises = Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(() => resolve(), 3000);
      });
    });

    Promise.all(imagePromises).then(() => {
      // Append cloned content to print window
      body.appendChild(content);
      
      // Focus window and trigger print after layout settles.
      printWindow.focus();
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (error) {
          console.error("Unable to auto-trigger print dialog:", error);
        }
      }, 100);
    });
  }, 200);
};
