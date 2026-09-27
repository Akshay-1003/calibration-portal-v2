import { useState, useEffect, useCallback } from 'react';

// Breakpoint definitions
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

// Hook for responsive breakpoint detection
export const useBreakpoint = () => {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('xs');
  const [windowWidth, setWindowWidth] = useState(0);

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      setWindowWidth(width);

      if (width >= breakpoints['2xl']) {
        setCurrentBreakpoint('2xl');
      } else if (width >= breakpoints.xl) {
        setCurrentBreakpoint('xl');
      } else if (width >= breakpoints.lg) {
        setCurrentBreakpoint('lg');
      } else if (width >= breakpoints.md) {
        setCurrentBreakpoint('md');
      } else if (width >= breakpoints.sm) {
        setCurrentBreakpoint('sm');
      } else {
        setCurrentBreakpoint('xs');
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  const isBreakpoint = useCallback((breakpoint: Breakpoint) => {
    return currentBreakpoint === breakpoint;
  }, [currentBreakpoint]);

  const isBreakpointOrAbove = useCallback((breakpoint: Breakpoint) => {
    return windowWidth >= breakpoints[breakpoint];
  }, [windowWidth]);

  const isBreakpointOrBelow = useCallback((breakpoint: Breakpoint) => {
    return windowWidth <= breakpoints[breakpoint];
  }, [windowWidth]);

  const isMobile = useCallback(() => {
    return windowWidth < breakpoints.md;
  }, [windowWidth]);

  const isTablet = useCallback(() => {
    return windowWidth >= breakpoints.md && windowWidth < breakpoints.lg;
  }, [windowWidth]);

  const isDesktop = useCallback(() => {
    return windowWidth >= breakpoints.lg;
  }, [windowWidth]);

  return {
    currentBreakpoint,
    windowWidth,
    isBreakpoint,
    isBreakpointOrAbove,
    isBreakpointOrBelow,
    isMobile,
    isTablet,
    isDesktop,
  };
};

// Hook for responsive values
export const useResponsiveValue = <T>(values: Partial<Record<Breakpoint, T>>, defaultValue: T): T => {
  const { currentBreakpoint } = useBreakpoint();
  
  // Find the appropriate value for the current breakpoint
  const getValue = useCallback(() => {
    const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
    
    // Check current breakpoint first
    if (values[currentBreakpoint] !== undefined) {
      return values[currentBreakpoint]!;
    }
    
    // Check for the closest smaller breakpoint
    for (let i = currentIndex + 1; i < breakpointOrder.length; i++) {
      const breakpoint = breakpointOrder[i];
      if (values[breakpoint] !== undefined) {
        return values[breakpoint]!;
      }
    }
    
    return defaultValue;
  }, [values, currentBreakpoint, defaultValue]);

  return getValue();
};

// Hook for responsive visibility
export const useResponsiveVisibility = (showOn: Breakpoint[] = ['sm']) => {
  const { isBreakpointOrAbove } = useBreakpoint();
  
  const isVisible = useCallback(() => {
    return showOn.some(breakpoint => isBreakpointOrAbove(breakpoint));
  }, [showOn, isBreakpointOrAbove]);

  return isVisible();
};

// Hook for responsive grid columns
export const useResponsiveGrid = () => {
  const { currentBreakpoint } = useBreakpoint();
  
  const getGridCols = useCallback(() => {
    switch (currentBreakpoint) {
      case 'xs':
        return 1;
      case 'sm':
        return 2;
      case 'md':
        return 3;
      case 'lg':
        return 4;
      case 'xl':
        return 5;
      case '2xl':
        return 6;
      default:
        return 3;
    }
  }, [currentBreakpoint]);

  const getTableCols = useCallback(() => {
    switch (currentBreakpoint) {
      case 'xs':
        return 2;
      case 'sm':
        return 3;
      case 'md':
        return 4;
      case 'lg':
        return 5;
      case 'xl':
        return 6;
      case '2xl':
        return 8;
      default:
        return 4;
    }
  }, [currentBreakpoint]);

  return {
    gridCols: getGridCols(),
    tableCols: getTableCols(),
  };
};

// Hook for responsive spacing
export const useResponsiveSpacing = () => {
  const { currentBreakpoint } = useBreakpoint();
  
  const getSpacing = useCallback((base: number) => {
    switch (currentBreakpoint) {
      case 'xs':
        return base * 0.5;
      case 'sm':
        return base * 0.75;
      case 'md':
        return base;
      case 'lg':
        return base * 1.25;
      case 'xl':
        return base * 1.5;
      case '2xl':
        return base * 1.75;
      default:
        return base;
    }
  }, [currentBreakpoint]);

  return { getSpacing };
};

// Hook for responsive font sizes
export const useResponsiveFontSize = () => {
  const { currentBreakpoint } = useBreakpoint();
  
  const getFontSize = useCallback((base: number) => {
    switch (currentBreakpoint) {
      case 'xs':
        return base * 0.875;
      case 'sm':
        return base * 0.9;
      case 'md':
        return base;
      case 'lg':
        return base * 1.1;
      case 'xl':
        return base * 1.2;
      case '2xl':
        return base * 1.3;
      default:
        return base;
    }
  }, [currentBreakpoint]);

  return { getFontSize };
};

// Hook for responsive container width
export const useResponsiveContainer = () => {
  const { currentBreakpoint } = useBreakpoint();
  
  const getContainerWidth = useCallback(() => {
    switch (currentBreakpoint) {
      case 'xs':
        return '100%';
      case 'sm':
        return '640px';
      case 'md':
        return '768px';
      case 'lg':
        return '1024px';
      case 'xl':
        return '1280px';
      case '2xl':
        return '1536px';
      default:
        return '100%';
    }
  }, [currentBreakpoint]);

  const getMaxWidth = useCallback(() => {
    return getContainerWidth();
  }, [getContainerWidth]);

  return {
    containerWidth: getContainerWidth(),
    maxWidth: getMaxWidth(),
  };
};
