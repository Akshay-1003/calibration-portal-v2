/**
 * Sticker Print Template Component
 * 2-column layout optimized for 78mm thermal roll printer.
 * Sticker size: 35mm × 15mm.
 * Clean, minimal, text-only industrial layout.
 */

import React from "react";
import type { StickerPrintData } from "../../utils/stickerPrint";
import type { SimpleStickerSettings } from "./StickerSettingsSimpleModal";
import { getStickerFontSize } from "./stickerTextFit";

interface StickerPrintTemplateProps {
  stickersData: StickerPrintData[];
  settings: SimpleStickerSettings;
}

export const StickerPrintTemplate: React.FC<StickerPrintTemplateProps> = ({
  stickersData,
  settings,
}) => {
  type StickerItemStyle = React.CSSProperties & {
    "--sticker-font-size": string;
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        .replace(/\//g, "/");
    } catch {
      return dateString;
    }
  };

  return (
    <div className="sticker-print-container">
      <div className="stickers-grid">
        {stickersData.map((sticker, index) => {
          const calDate = formatDate(sticker.calibration_date);
          const dueDate = formatDate(sticker.calibration_due_date);

          const fontSize = getStickerFontSize({
            vmcId: sticker.lab_id || "-",
            gId: sticker.identification_number || "-",
            calDate,
            dueDate,
            withIdentification: settings.withIdentification,
          });

          const itemStyle: StickerItemStyle = {
            "--sticker-font-size": `${fontSize}px`,
          };

          return (
            <div
              key={`${sticker.lab_id || "sticker"}-${index}`}
              className="sticker-item"
              style={itemStyle}
            >
              <div className="sticker-fields">
                <div className="sticker-field-row">
                  <div className="sticker-label">VMC ID:</div>
                  <div className="sticker-value">{sticker.lab_id || "-"}</div>
                </div>

                {settings.withIdentification && (
                  <div className="sticker-field-row">
                    <div className="sticker-label">G.ID:</div>
                    <div className="sticker-value">
                      {sticker.identification_number || "-"}
                    </div>
                  </div>
                )}

                <div className="sticker-field-row">
                  <div className="sticker-label">Cal Dt:</div>
                  <div className="sticker-value">{calDate}</div>
                </div>

                <div className="sticker-field-row">
                  <div className="sticker-label">Due Dt:</div>
                  <div className="sticker-value">{dueDate}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
