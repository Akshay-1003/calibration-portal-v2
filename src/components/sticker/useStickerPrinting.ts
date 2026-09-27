import { useState, useCallback } from "react";
import { apiClient } from "../../services/api";
import { toast } from "sonner";
import type { StickerSettings } from "./StickerSettingsModal";
import type { StickerPreviewData } from "./StickerPreviewModal";
import { printStickersWithQzTray } from "../../utils/stickerQzPrint";

export interface StickerData {
  lab_id: string;
  identification_number?: string;
  manf_serial_number?: string;
  calibration_date: string;
  calibration_due_date: string;
  barcode_url?: string; // URL to barcode image from backend (if provided)
  barcode_data?: string; // Barcode data (if provided)
}

export type StickerPrintResponse = StickerData[];

export function useStickerPrinting() {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<StickerPreviewData[]>([]);
  
  // Browser print function - navigates to print page
  const printStickersBrowser = useCallback(
    (previewData: StickerPreviewData[], settings: StickerSettings) => {
      if (previewData.length === 0) {
        toast.error("No stickers to print");
        return;
      }

      // Navigate to browser print page with sticker data
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Please allow popups to use browser printing");
        return;
      }

      // Store data in sessionStorage for the print page to access
      sessionStorage.setItem(
        "stickerPrintData",
        JSON.stringify({
          stickerData: previewData,
          settings: {
            withIdentification: settings.withIdentification,
            withBarcode: settings.withBarcode,
          },
        })
      );

      // Navigate the opened window to print route
      const printUrl = `/print/stickers?timestamp=${Date.now()}`;
      printWindow.location.href = printUrl;
    },
    []
  );

  // Generate sticker preview data
  const generateStickerPreview = useCallback(
    async (
      selectedIds: string[] = [],
      settings: StickerSettings
    ): Promise<StickerPreviewData[] | null> => {
      setLoading(true);
      try {
        if (selectedIds.length === 0) {
          toast.error("Please select at least one gauge to print sticker");
          return null;
        }

        // Call API to get sticker data
        const response = await apiClient.post<StickerPrintResponse>(
          "/inward-gauges/sticker-data",
          {
            inward_gauge_ids: selectedIds,
          }
        );

        if (!response || !Array.isArray(response) || response.length === 0) {
          throw new Error("No sticker data received from API");
        }

        // Map API response to preview data with fixed 15x35 size
        const previewData: StickerPreviewData[] = response.map((stickerData) => {
          return {
            stickerData,
            settings: {
              size: "15x35", // Fixed size
              withIdentification: settings.withIdentification,
              withBarcode: settings.withBarcode,
            },
          };
        });

        setPreviewData(previewData);
        toast.success(`Generated preview for ${previewData.length} sticker(s)`);
        return previewData;
      } catch (error) {
        console.error("Error generating sticker preview:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to generate sticker preview";
        toast.error(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Print stickers using qz-tray (only for QZ Tray mode)
  const printStickers = useCallback(
    async (
      previewData: StickerPreviewData[],
      settings: StickerSettings
    ): Promise<boolean> => {
      setLoading(true);
      try {
        if (previewData.length === 0) {
          toast.error("No stickers to print");
          return false;
        }

        // If browser mode, this shouldn't be called (handled separately)
        if (settings.printMode === 'browser') {
          console.warn("printStickers called with browser mode - this should use printStickersBrowser");
          return false;
        }

        const result = await printStickersWithQzTray(
          previewData.map((item) => item.stickerData),
          { withIdentification: settings.withIdentification }
        );

        toast.success(`Successfully sent ${result.stickerCount} sticker(s) to ${result.printerName}`);
        return true;
      } catch (error) {
        console.error("Error printing stickers:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to print stickers";
        toast.error(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearPreview = useCallback(() => {
    setPreviewData([]);
  }, []);

  return {
    loading,
    previewData,
    generateStickerPreview,
    printStickers,
    printStickersBrowser,
    clearPreview,
  };
}
