/**
 * Direct print utility for Inward Challan
 * Opens print window directly without modal
 */

import { INWARD_CHALAN_PRINT_STYLES } from "../components/chalan/inwardChalanPrintStyles";
import type { InwardChalanData } from "../components/chalan/InwardChalanTemplate";
import { InwardChalanTemplate } from "../components/chalan/InwardChalanTemplate";
import React from "react";
import { createRoot, Root } from "react-dom/client";

/**
 * Open print window directly with chalan data
 */
export const printInwardChalan = (chalanData: InwardChalanData): void => {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    throw new Error("Please allow popups to print");
  }

  const doc = printWindow.document;
  
  // Set HTML structure
  doc.documentElement.innerHTML = '<head></head><body></body>';
  
  const head = doc.head;
  const body = doc.body;
  
  // Set document title
  const title = doc.createElement('title');
  title.textContent = 'Inward Chalan - Print';
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
    /* Page Setup - minimal margins for print */
    @page {
      size: A4;
      margin: 5mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #000;
      background: #f5f5f5;
      line-height: 1.4;
    }

    /* Shared inward chalan print styles */
    ${INWARD_CHALAN_PRINT_STYLES}

    /* Remove screen-only styles */
    .shadow,
    .shadow-lg {
      box-shadow: none !important;
    }

    /* Print window specific - minimal padding, no double borders */
    @media print {
      body {
        padding: 0;
        margin: 0;
        background: #fff;
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
  root.render(React.createElement(InwardChalanTemplate, { data: chalanData }));
  
  // Wait for React to render, then clone and move to print window
  setTimeout(() => {
    const chalanElement = tempContainer.querySelector('.chalan-print') as HTMLElement;
    if (!chalanElement) {
      console.error('Failed to render chalan template');
      tempContainer.remove();
      root.unmount();
      printWindow.close();
      return;
    }
    
    // Clone the content
    const content = chalanElement.cloneNode(true) as HTMLElement;
    
    // Clean up temporary container
    tempContainer.remove();
    root.unmount();
    
    // Wait for images to load
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
      
      // Focus window - user can press Ctrl+P (or Cmd+P on Mac) to print
      printWindow.focus();
    });
  }, 200);
};

