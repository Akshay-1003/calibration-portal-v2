"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Checkbox,
  Select,
  SelectItem,
  Spinner,
} from "@heroui-v2/react";
import { PrinterIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { getQz } from "../../utils/qzTray";
import { connectQzTray } from "../../utils/qzTrayInit";

export type PrintMode = 'qz-tray' | 'browser';

export interface StickerSettings {
  printMode: PrintMode;
  withIdentification: boolean;
  withBarcode: boolean;
  printerName?: string;
}

interface StickerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (settings: StickerSettings) => void;
  selectedCount: number;
  loading?: boolean;
}


export function StickerSettingsModal({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  loading = false,
}: StickerSettingsModalProps) {
  const [settings, setSettings] = useState<StickerSettings>({
    printMode: 'qz-tray',
    withIdentification: true,
    withBarcode: true,
    printerName: "",
  });
  const [printers, setPrinters] = useState<string[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [qzConnected, setQzConnected] = useState(false);

  const connectAndFetchPrinters = useCallback(async () => {
    try {
      setLoadingPrinters(true);
      // Use the initialization utility which handles certificate signing
      await connectQzTray();
      const qz = getQz();
      setQzConnected(true);

      // Fetch available printers
      const printerList = await qz.printers.find();
      setPrinters(printerList || []);
      
      // Set default printer if available and not already set
      if (printerList && printerList.length > 0) {
        const defaultPrinter = printerList.find((p: string) => 
          p.toLowerCase().includes("tsc") || 
          p.toLowerCase().includes("te244") ||
          p.toLowerCase().includes("thermal")
        ) || printerList[0];
        setSettings((prev) => {
          if (prev.printerName) return prev;
          return { ...prev, printerName: defaultPrinter };
        });
      }
    } catch (error) {
      console.error("Error connecting to QZ Tray:", error);
      toast.error("Failed to connect to QZ Tray. Please ensure QZ Tray is running.");
      setQzConnected(false);
    } finally {
      setLoadingPrinters(false);
    }
  }, []);

  // Connect to QZ Tray and fetch printers - only when QZ Tray mode is selected
  useEffect(() => {
    if (isOpen && settings.printMode === 'qz-tray') {
      void connectAndFetchPrinters();
    }
  }, [isOpen, settings.printMode, connectAndFetchPrinters]);

  const handleConfirm = () => {
    // Printer selection is optional - user can select later or use default
    onConfirm(settings);
  };

  const handleReset = () => {
    setSettings({
      printMode: 'qz-tray',
      withIdentification: true,
      withBarcode: true,
      printerName: printers[0] || "",
    });
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <PrinterIcon className="h-5 w-5" />
                <span>Sticker Print Settings</span>
              </div>
              <p className="text-sm font-normal text-gray-500">
                {selectedCount === 1
                  ? "Print sticker for 1 selected gauge"
                  : `Print stickers for ${selectedCount} selected gauges`}
              </p>
              <p className="text-xs font-normal text-gray-400 mt-1">
                Sticker Size: 15 x 35 mm (Fixed)
              </p>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-6 py-2">
                {/* Print Mode Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    1. Select Print Mode *
                  </label>
                  <Select
                    selectedKeys={[settings.printMode]}
                    onSelectionChange={(keys) => {
                      const mode = Array.from(keys)[0] as PrintMode;
                      setSettings((prev) => ({ ...prev, printMode: mode }));
                    }}
                    className="w-full"
                  >
                    <SelectItem key="qz-tray" textValue="QZ Tray">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">QZ Tray</span>
                        <span className="text-xs text-gray-500">Direct printer communication</span>
                      </div>
                    </SelectItem>
                    <SelectItem key="browser" textValue="Browser Print">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">Browser Print</span>
                        <span className="text-xs text-gray-500">Uses browser print dialog</span>
                      </div>
                    </SelectItem>
                  </Select>
                </div>

                {/* Printer Selection - Only show for QZ Tray mode */}
                {settings.printMode === 'qz-tray' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      2. Select Printer *
                    </label>
                  {loadingPrinters ? (
                    <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg">
                      <Spinner size="sm" />
                      <span className="text-sm text-gray-500">Connecting to QZ Tray...</span>
                    </div>
                  ) : !qzConnected ? (
                    <div className="p-3 border border-red-200 rounded-lg bg-red-50">
                      <p className="text-sm text-red-600">
                        QZ Tray is not connected. Please ensure QZ Tray application is running.
                      </p>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        className="mt-2"
                        onPress={connectAndFetchPrinters}
                      >
                        Retry Connection
                      </Button>
                    </div>
                  ) : (
                    <Select
                      selectedKeys={settings.printerName ? [settings.printerName] : []}
                      onSelectionChange={(keys) => {
                        const printer = Array.from(keys)[0] as string;
                        setSettings((prev) => ({ ...prev, printerName: printer }));
                      }}
                      placeholder="Select a printer"
                      className="w-full"
                      isDisabled={printers.length === 0}
                    >
                      {printers.map((printer) => (
                        <SelectItem key={printer}>
                          {printer}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                  {printers.length === 0 && qzConnected && (
                    <p className="text-xs text-gray-500 mt-1">No printers found</p>
                  )}
                  </div>
                )}

                {/* Select Details */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {settings.printMode === 'qz-tray' ? '3. Select Details *' : '2. Select Details *'}
                  </label>
                  <div className="space-y-3">
                    {/* With/Without Identification */}
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {settings.withIdentification
                            ? "Show G.ID"
                            : "Hide G.ID"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {settings.withIdentification
                            ? "Display gauge identification row on sticker"
                            : "Do not print gauge identification row"}
                        </span>
                      </div>
                      <Checkbox
                        isSelected={settings.withIdentification}
                        onValueChange={(checked) =>
                          setSettings((prev) => ({
                            ...prev,
                            withIdentification: checked,
                          }))
                        }
                      />
                    </div>

                    {/* With/Without Barcode */}
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {settings.withBarcode
                            ? "With Barcode"
                            : "Without Barcode"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {settings.withBarcode
                            ? "Include barcode on sticker"
                            : "Exclude barcode from sticker"}
                        </span>
                      </div>
                      <Checkbox
                        isSelected={settings.withBarcode}
                        onValueChange={(checked) =>
                          setSettings((prev) => ({
                            ...prev,
                            withBarcode: checked,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={handleReset} isDisabled={loading}>
                Reset
              </Button>
              <Button
                variant="light"
                onPress={onClose}
                isDisabled={loading}
              >
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleConfirm}
                isLoading={loading}
                startContent={!loading && <PrinterIcon className="h-4 w-4" />}
              >
                {loading ? "Printing..." : "Print"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
