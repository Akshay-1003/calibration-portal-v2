import type { StickerPrintData } from "./stickerPrint";
import { connectQzTray } from "./qzTrayInit";
import { getQz } from "./qzTray";
import { generateTSPLRows, type StickerData } from "./tsplGenerator";

export const TSC_TE244_PRINTER_NAME = "TSC TE244";

const TSC_TE244_PRINTER_MATCHERS = ["tsc te244", "te244"];

export interface QzStickerPrintSettings {
  withIdentification?: boolean;
}

function formatStickerDate(dateString: string): string {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

export function prepareTsplStickerData(
  stickersData: StickerPrintData[],
  settings: QzStickerPrintSettings
): StickerData[] {
  return stickersData.map((sticker) => ({
    vmcId: sticker.lab_id || "-",
    gId: sticker.identification_number || "-",
    calDate: formatStickerDate(sticker.calibration_date),
    dueDate: formatStickerDate(sticker.calibration_due_date),
    barcodeData: sticker.barcode_data || sticker.lab_id,
    withIdentification: settings.withIdentification !== false,
  }));
}

function findMatchingPrinter(printers: string[]): string | null {
  for (const matcher of TSC_TE244_PRINTER_MATCHERS) {
    const matched = printers.find((printer) =>
      printer.toLowerCase().includes(matcher)
    );

    if (matched) {
      return matched;
    }
  }

  return null;
}

export async function findTscTe244Printer(): Promise<string> {
  const qz = getQz();
  const printers = await qz.printers.find();
  const printerName = findMatchingPrinter(printers || []);

  if (!printerName) {
    const printerList = printers?.length ? printers.join(", ") : "none";
    throw new Error(
      `${TSC_TE244_PRINTER_NAME} printer was not found through QZ Tray. Available printers: ${printerList}. Regular Print is still available.`
    );
  }

  return printerName;
}

export async function printStickersWithQzTray(
  stickersData: StickerPrintData[],
  settings: QzStickerPrintSettings
): Promise<{ printerName: string; rowCount: number; stickerCount: number }> {
  if (!stickersData || stickersData.length === 0) {
    throw new Error("No sticker data provided");
  }

  await connectQzTray();

  const qz = getQz();
  const printerName = await findTscTe244Printer();
  const config = qz.configs.create(printerName, {
    copies: 1,
    units: "mm",
  });
  const commands = generateTSPLRows(prepareTsplStickerData(stickersData, settings));

  for (const command of commands) {
    await qz.print(config, [
      {
        type: "raw",
        format: "command",
        data: command,
      },
    ]);
  }

  return {
    printerName,
    rowCount: commands.length,
    stickerCount: stickersData.length,
  };
}

