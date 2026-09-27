import { useEffect } from 'react';

/**
 * Custom hook to manage document title
 * @param title - The title to set for the page
 * @param suffix - Optional suffix to append (defaults to app name)
 */
export function useDocumentTitle(title?: string, suffix?: string) {
  useEffect(() => {
    const defaultTitle = 'Calibration Management System';
    const appSuffix = suffix || defaultTitle;
    
    if (title) {
      document.title = `${title} - ${appSuffix}`;
    } else {
      document.title = defaultTitle;
    }

    // Cleanup function to reset title when component unmounts
    return () => {
      document.title = defaultTitle;
    };
  }, [title, suffix]);
}

/**
 * Set document title directly (for use outside of React components)
 * @param title - The title to set
 * @param suffix - Optional suffix
 */
export function setDocumentTitle(title?: string, suffix?: string) {
  const defaultTitle = 'Calibration Management System';
  const appSuffix = suffix || defaultTitle;
  
  if (title) {
    document.title = `${title} - ${appSuffix}`;
  } else {
    document.title = defaultTitle;
  }
}