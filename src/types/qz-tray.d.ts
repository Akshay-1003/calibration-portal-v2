/* eslint-disable @typescript-eslint/no-explicit-any */

export interface QzTrayApi {
  websocket: {
    isActive(): boolean;
    connect(options?: any): Promise<void>;
    disconnect(): Promise<void>;
    setClosedCallbacks(callback: () => void): void;
  };
  security: {
    setCertificatePromise(promise: () => Promise<string>): void;
    setSignaturePromise(promise: (toSign: string) => Promise<string>): void;
  };
  printers: {
    find(filter?: string | null): Promise<string[]>;
    getDefault(): Promise<string>;
  };
  configs: {
    create(
      printerName: string,
      options?: {
        copies?: number;
        density?: number;
        orientation?: "portrait" | "landscape";
        margins?: number;
        units?: "mm" | "in";
      }
    ): any;
  };
  print(
    config: any,
    data: Array<{
      type: "raw" | "pixel" | "html";
      format?: string;
      data: string;
    }>
  ): Promise<void>;
}

declare global {
  interface Window {
    qz?: QzTrayApi;
  }

  const qz: QzTrayApi;
}

declare module "qz-tray" {
  const qz: QzTrayApi;
  export default qz;
}

