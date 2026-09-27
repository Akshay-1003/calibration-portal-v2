declare module 'html-to-image' {
  interface Options {
    quality?: number;
    pixelRatio?: number;
    backgroundColor?: string;
    width?: number;
    height?: number;
    style?: Record<string, string>;
    filter?: (node: Node) => boolean;
    imagePlaceholder?: string;
    cacheBust?: boolean;
    includeQueryParams?: boolean;
    skipAutoScale?: boolean;
    preferredFontFormat?: 'woff' | 'woff2' | 'truetype' | 'opentype' | 'embedded-opentype' | 'svg';
  }

  export function toPng(node: HTMLElement, options?: Options): Promise<string>;
  export function toJpeg(node: HTMLElement, options?: Options): Promise<string>;
  export function toSvg(node: HTMLElement, options?: Options): Promise<string>;
  export function toPixelData(node: HTMLElement, options?: Options): Promise<Uint8ClampedArray>;
  export function toCanvas(node: HTMLElement, options?: Options): Promise<HTMLCanvasElement>;
  export function toBlob(node: HTMLElement, options?: Options): Promise<Blob>;
}