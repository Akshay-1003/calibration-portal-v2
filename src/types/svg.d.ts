declare module '*.svg?react' {
  import type { ComponentType, SVGProps } from 'react';

  export const ReactComponent: ComponentType<SVGProps<SVGSVGElement>>;
}
