import type { CSSProperties } from "react";
import { useMemo } from "react";
import type { StickerPreviewData } from "./StickerPreviewModal";
import { STICKER_PRINT_STYLES } from "./stickerPrintStyles";
import { getStickerFontSize } from "./stickerTextFit";

interface StickerBrowserPrintTemplateProps {
  stickerData: StickerPreviewData[];
  settings: {
    withIdentification: boolean;
    withBarcode: boolean;
  };
}

/**
 * Browser print template for stickers.
 * Uses the same mm-precise classes as direct print template.
 */
export function StickerBrowserPrintTemplate({
  stickerData,
  settings,
}: StickerBrowserPrintTemplateProps) {
  type StickerItemStyle = CSSProperties & {
    "--sticker-font-size": string;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${date.getFullYear()}`;
  };

  const normalizedData = useMemo(() => {
    if (!stickerData || stickerData.length === 0) {
      return [];
    }

    return stickerData.map((item) => {
      const vmcId = item.stickerData.lab_id || "-";
      const gId = item.stickerData.identification_number || "-";
      const calDate = formatDate(item.stickerData.calibration_date);
      const dueDate = formatDate(item.stickerData.calibration_due_date);

      return {
        vmcId,
        gId,
        calDate,
        dueDate,
        fontSize: getStickerFontSize({
          vmcId,
          gId,
          calDate,
          dueDate,
          withIdentification: settings.withIdentification,
        }),
      };
    });
  }, [settings.withIdentification, stickerData]);

  return (
    <>
      <style>{STICKER_PRINT_STYLES}</style>
      <div className="sticker-print-container">
        <div className="stickers-grid">
          {normalizedData.map((item, index) => {
            const itemStyle: StickerItemStyle = {
              "--sticker-font-size": `${item.fontSize}px`,
            };

            return (
              <div
                key={`sticker-${index}-${item.vmcId}`}
                className="sticker-item"
                style={itemStyle}
              >
                <div className="sticker-fields">
                  <div className="sticker-field-row">
                    <div className="sticker-label">VMC ID:</div>
                    <div className="sticker-value">{item.vmcId}</div>
                  </div>
                  {settings.withIdentification && (
                    <div className="sticker-field-row">
                      <div className="sticker-label">G.ID:</div>
                      <div className="sticker-value">{item.gId}</div>
                    </div>
                  )}
                  <div className="sticker-field-row">
                    <div className="sticker-label">Cal Dt:</div>
                    <div className="sticker-value">{item.calDate}</div>
                  </div>
                  <div className="sticker-field-row">
                    <div className="sticker-label">Due Dt:</div>
                    <div className="sticker-value">{item.dueDate}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
