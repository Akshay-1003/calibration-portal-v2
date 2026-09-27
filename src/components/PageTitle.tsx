import { useDocumentTitle } from '../hooks/useDocumentTitle';

interface PageTitleProps {
  title?: string;
  suffix?: string;
}

/**
 * Component to set page title
 * Use this component at the top of your page components
 */
export function PageTitle({ title, suffix }: PageTitleProps) {
  useDocumentTitle(title, suffix);
  return null; // This component doesn't render anything
}

export default PageTitle;