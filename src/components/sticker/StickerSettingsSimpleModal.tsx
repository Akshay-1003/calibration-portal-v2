/**
 * Simple Settings Modal for Sticker Printing
 * Allows user to choose:
 * 1. Regular browser printing or QZ Tray printing
 * 2. Show/Hide G.ID field
 */

import { useState } from "react";
import {
  Button,
  Checkbox,
  Modal,
} from "@heroui/react";

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
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header className="flex flex-col gap-1">
              <Modal.Heading>Sticker Print Settings</Modal.Heading>
              <p className="text-sm text-default-500 font-normal">
                Configure sticker layout options for {selectedCount} sticker{selectedCount > 1 ? "s" : ""}
              </p>
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-default-700">Print Method</span>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={settings.printMethod === "regular" ? "primary" : "secondary"}
                      onPress={() =>
                        setSettings((prev) => ({ ...prev, printMethod: "regular" }))
                      }
                    >
                      Regular Print
                    </Button>
                    <Button
                      variant={settings.printMethod === "qz" ? "primary" : "secondary"}
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
                    onChange={(checked) =>
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
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={handleReset}>
                Reset
              </Button>
              <Button variant="ghost" onPress={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onPress={handleConfirm}>
                Print Stickers
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}

