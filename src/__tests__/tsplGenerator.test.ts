import { describe, expect, it } from "vitest";
import { generateTSPLRow, generateTSPLRows, TSC_TE244_MEDIA } from "../utils/tsplGenerator";

describe("TSC TE244 TSPL sticker generator", () => {
  const leftSticker = {
    vmcId: "VMC-001",
    gId: "G-001",
    calDate: "20/09/2026",
    dueDate: "20/09/2027",
    withIdentification: true,
  };

  const rightSticker = {
    vmcId: "VMC-002",
    gId: "G-002",
    calDate: "21/09/2026",
    dueDate: "21/09/2027",
    withIdentification: true,
  };

  it("uses the configured 77 mm gap-media sticker setup", () => {
    const command = generateTSPLRow(leftSticker, rightSticker);

    expect(TSC_TE244_MEDIA).toMatchObject({
      mediaWidthMm: 77,
      stickerWidthMm: 35,
      stickerHeightMm: 15,
      horizontalGapMm: 2,
      verticalGapMm: 3,
      dpi: 203,
    });
    expect(command).toContain("SIZE 77 mm, 15 mm");
    expect(command).toContain("GAP 3 mm, 0 mm");
    expect(command).toContain("SET RIBBON ON");
    expect(command).toContain("SET TEAR ON");
    expect(command).toContain("PRINT 1,1");
  });

  it("prints two different stickers in one row using native text commands", () => {
    const command = generateTSPLRow(leftSticker, rightSticker);

    expect(command).toContain('"VMC ID:"');
    expect(command).toContain('"G.ID:"');
    expect(command).toContain('"Cal Dt:"');
    expect(command).toContain('"Due Dt:"');
    expect(command).toContain('"VMC-001"');
    expect(command).toContain('"G-001"');
    expect(command).toContain('"VMC-002"');
    expect(command).toContain('"G-002"');
    expect(command).not.toContain("BARCODE");
  });

  it("groups sticker data into two-column rows", () => {
    const commands = generateTSPLRows([
      leftSticker,
      rightSticker,
      { ...leftSticker, vmcId: "VMC-003", gId: "G-003" },
    ]);

    expect(commands).toHaveLength(2);
    expect(commands[0]).toContain('"VMC-001"');
    expect(commands[0]).toContain('"VMC-002"');
    expect(commands[1]).toContain('"VMC-003"');
  });
});

