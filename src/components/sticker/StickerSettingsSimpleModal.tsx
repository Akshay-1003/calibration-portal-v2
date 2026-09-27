/**
 * Simple Settings Modal for Sticker Printing
 * Allows user to choose:
 * 1. Regular browser printing or QZ Tray printing
 * 2. Show/Hide G.ID field
 */

import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Checkbox,
} from "@heroui-v2/react";

export type StickerPrintMethod = "regular" | "qz";

export interface SimpleStickerSettings {
  printMethod: StickerPrintMethod;
  withIdentification: boolean;
  withQRCode: boolean;
}

interface StickerSettingsSimpleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (settings: SimpleStickerSettings) => void;
  selectedCount: number;
}

export function StickerSettingsSimpleModal({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
}: StickerSettingsSimpleModalProps) {
  const [settings, setSettings] = useState<SimpleStickerSettings>({
    printMethod: "regular",
    withIdentification: true,
    withQRCode: false,
  });

  const handleConfirm = () => {
    onConfirm(settings);
  };

  const handleReset = () => {
    setSettings({
      printMethod: "regular",
      withIdentification: true,
      withQRCode: false,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold">Sticker Print Settings</h3>
              <p className="text-sm text-default-500 font-normal">
                Configure sticker layout options for {selectedCount} sticker{selectedCount > 1 ? "s" : ""}
              </p>
            </ModalHeader>
            <ModalBody>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-default-700">Print Method</span>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      color={settings.printMethod === "regular" ? "primary" : "default"}
                      variant={settings.printMethod === "regular" ? "solid" : "flat"}
                      onPress={() =>
                        setSettings((prev) => ({ ...prev, printMethod: "regular" }))
                      }
                    >
                      Regular Print
                    </Button>
                    <Button
                      color={settings.printMethod === "qz" ? "primary" : "default"}
                      variant={settings.printMethod === "qz" ? "solid" : "flat"}
                      onPress={() =>
                        setSettings((prev) => ({ ...prev, printMethod: "qz" }))
                      }
                    >
                      QZ Tray Print
                    </Button>
                  </div>
                </div>

                {/* Show G.ID Option */}
                <div className="flex flex-col gap-2">
                  <Checkbox
                    isSelected={settings.withIdentification}
                    onValueChange={(checked) =>
                      setSettings((prev) => ({ ...prev, withIdentification: checked }))
                    }
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Show G.ID</span>
                      <span className="text-xs text-default-500">
                        Display gauge identification row on sticker
                      </span>
                    </div>
                  </Checkbox>
                </div>

                {/* Preview */}
                <div className="border border-default-200 rounded-lg p-3 bg-default-50">
                  <p className="text-xs font-medium text-default-600 mb-2">Preview:</p>
                  <div className="text-xs text-default-700 space-y-1">
                    <div>
                      Print: {settings.printMethod === "qz" ? "QZ Tray / TSC TE244" : "Regular browser print"}
                    </div>
                    <div>✓ VMC ID (always shown)</div>
                    <div>{settings.withIdentification ? "✓" : "✗"} G.ID</div>
                    <div>✓ Cal Dt (always shown)</div>
                    <div>✓ Due Dt (always shown)</div>
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="default" variant="flat" onPress={handleReset}>
                Reset
              </Button>
              <Button color="danger" variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button color="primary" onPress={handleConfirm}>
                Print Stickers
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}


