import qzTray from "qz-tray";
import type { QzTrayApi } from "../types/qz-tray";

export function getQz() {
  if (typeof window === 'undefined') {
    throw new Error('qz-tray library requires a browser environment');
  }

  const qzLib = window.qz || (qzTray as QzTrayApi | undefined);
  
  if (!qzLib) {
    throw new Error(
      'QZ Tray library is not available. Please ensure the qz-tray package is installed and the app is running in a browser.'
    );
  }
  
  return qzLib;
}
