"use client";

import React, { useMemo } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui-v2/react";
import { PrinterIcon, XMarkIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { StickerPreviewRenderer } from "./StickerPreviewRenderer";
import { DEFAULT_LAYOUTS, type StickerTemplateData } from "./stickerLayout";
import type { StickerData } from "./useStickerPrinting";

export interface StickerPreviewData {
  stickerData: StickerData; // API response data
  settings: {
    size: string;
    withIdentification: boolean;
    withBarcode: boolean;
  };
}

interface StickerPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewData: StickerPreviewData[];
  onPrint: () => void;
  loading?: boolean;
}

// Convert API sticker data to template data for preview
const convertStickerDataToTemplate = (
  stickerData: StickerData,
  settings: StickerPreviewData["settings"]
): StickerTemplateData => {
  // Format date from YYYY-MM-DD to DD/MM/YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  return {
    vmcId: stickerData.lab_id,
    gId: settings.withIdentification ? (stickerData.identification_number || "-") : "-",
    calDate: formatDate(stickerData.calibration_date),
    dueDate: formatDate(stickerData.calibration_due_date),
    barcodeData: stickerData.barcode_data || stickerData.lab_id,
    barcodeUrl: stickerData.barcode_url, // Barcode image URL from API
  };
};

// Sticker Preview Component using pixel-accurate layout
const StickerPreview: React.FC<{
  data: StickerPreviewData;
  index: number;
}> = ({ data }) => {
  const templateData = useMemo(
    () => convertStickerDataToTemplate(data.stickerData, data.settings),
    [data]
  );
  
  // Get layout for the sticker size (from settings, internal data)
  const layout = DEFAULT_LAYOUTS[data.settings.size] || DEFAULT_LAYOUTS["15x35"];

  // Filter layout elements based on settings
  const filteredLayout = useMemo(() => {
    const elements = layout.elements.filter((element) => {
      // Hide G.ID label and value if identification is disabled
      if (element.type === "text" && element.content.includes("G.ID")) {
        return data.settings.withIdentification;
      }
      if (element.type === "text" && element.content.includes("{gId}")) {
        return data.settings.withIdentification;
      }
      // Hide barcode if disabled
      if (element.type === "barcode") {
        return data.settings.withBarcode;
      }
      return true;
    });

    // Adjust Y positions to remove gaps when G.ID is hidden
    let adjustedElements = elements;
    if (!data.settings.withIdentification) {
      // Find the G.ID label position and shift everything below it up
      const gIdLabelIndex = layout.elements.findIndex(
        (el) => el.type === "text" && el.content.includes("G.ID:")
      );
      
      if (gIdLabelIndex !== -1) {
        const gIdLabelY = layout.elements[gIdLabelIndex].y;
        const gIdValueY = layout.elements.find(
          (el) => el.type === "text" && el.content.includes("{gId}")
        )?.y;
        
        // Calculate the gap to remove (space between G.ID label and value, plus some spacing)
        const gapToRemove = gIdValueY ? (gIdValueY - gIdLabelY + 2) : 3;
        
        adjustedElements = elements.map((element) => {
          if (element.y > gIdLabelY) {
      return {
              ...element,
              y: element.y - gapToRemove,
      };
          }
          return element;
        });
      }
    }

    return {
      ...layout,
      elements: adjustedElements,
      };
  }, [layout, data.settings]);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full flex justify-center">
        <StickerPreviewRenderer
          layout={filteredLayout}
          data={templateData}
          barcodeUrl={data.stickerData.barcode_url}
          className="shadow-lg"
        />
      </div>
      {/* Sticker Label */}
      <div className="text-[10px] text-gray-500 text-center mt-2">
        {layout.width} x {layout.height} mm
      </div>
    </div>
  );
};

export function StickerPreviewModal({
  isOpen,
  onClose,
  previewData,
  onPrint,
  loading = false,
}: StickerPreviewModalProps) {
  if (previewData.length === 0) return null;

  const firstSticker = previewData[0];
  const layout = DEFAULT_LAYOUTS[firstSticker.settings.size] || DEFAULT_LAYOUTS["15x35"];
  const dimensions = { width: layout.width, height: layout.height };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      scrollBehavior="inside"
      classNames={{
        base: "max-w-[95vw] sm:max-w-6xl lg:max-w-7xl",
        body: "overflow-y-auto max-h-[70vh]",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 pb-3 border-b">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <PrinterIcon className="h-6 w-6 text-primary" />
                  <span className="text-xl font-semibold">Sticker Preview</span>
                </div>
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  onPress={onClose}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-sm font-normal text-gray-500 mt-1">
                Preview of {previewData.length} sticker{previewData.length > 1 ? "s" : ""} - Size: {dimensions.width} x {dimensions.height} mm
              </p>
            </ModalHeader>
            
            <ModalBody className="py-6">
              <div className="space-y-6">
                {/* Settings Summary Card */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Print Settings Summary
                  </h4>
                  <div className="grid grid-cols-4 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white rounded-md p-2 shadow-sm">
                      <div className="text-gray-500 font-medium mb-1">Size</div>
                      <div className="text-gray-900 font-bold">{dimensions.width} x {dimensions.height} mm</div>
                    </div>
                    <div className="bg-white rounded-md p-2 shadow-sm">
                      <div className="text-gray-500 font-medium mb-1">Identification</div>
                      <div className="text-gray-900 font-bold">
                        {firstSticker.settings.withIdentification ? (
                          <span className="text-green-600">✓ Included</span>
                        ) : (
                          <span className="text-gray-400">✗ Excluded</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-white rounded-md p-2 shadow-sm">
                      <div className="text-gray-500 font-medium mb-1">Barcode</div>
                      <div className="text-gray-900 font-bold">
                        {firstSticker.settings.withBarcode ? (
                          <span className="text-green-600">✓ Included</span>
                        ) : (
                          <span className="text-gray-400">✗ Excluded</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-white rounded-md p-2 shadow-sm">
                      <div className="text-gray-500 font-medium mb-1">Quantity</div>
                      <div className="text-gray-900 font-bold">{previewData.length} sticker{previewData.length > 1 ? "s" : ""}</div>
                    </div>
                  </div>
                </div>

                {/* Sticker Previews Grid */}
                <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                    Sticker Previews
                  </h4>
                  <div 
                    className="grid gap-3 sm:gap-4 md:gap-6 justify-items-center w-full"
                    style={{
                      gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
                    }}
                  >
                    {previewData.map((item, index) => (
                      <StickerPreview
                        key={item.stickerData.lab_id || index}
                        data={item}
                        index={index}
                      />
                    ))}
                  </div>
                </div>

                {/* Info Note */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-800">
                    <strong>Note:</strong> This is a preview of how your stickers will look when printed. 
                    The actual printed stickers will match the selected size ({dimensions.width} x {dimensions.height} mm) and settings.
                  </p>
                </div>
              </div>
            </ModalBody>
            
            <ModalFooter className="border-t pt-4">
              <Button 
                variant="light" 
                onPress={onClose} 
                isDisabled={loading}
                startContent={<ArrowLeftIcon className="h-4 w-4" />}
              >
                Back
              </Button>
              <Button
                color="primary"
                onPress={onPrint}
                isLoading={loading}
                startContent={!loading && <PrinterIcon className="h-5 w-5" />}
                className="font-semibold"
              >
                {loading ? "Printing..." : `Print ${previewData.length} Sticker${previewData.length > 1 ? "s" : ""}`}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
