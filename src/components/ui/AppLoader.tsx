/**
 * Standardized Loader Component using HeroUI Spinner
 * Used consistently across the app for all loading states
 */

import { Spinner } from '@heroui/react';
import { cn } from '../../lib/utils';

interface AppLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

/**
 * Standard loader component for inline/component loading states
 */
export const AppLoader: React.FC<AppLoaderProps> = ({
  size = 'md',
  label,
  className,
  color = 'primary',
}) => {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Spinner size={size} color={color} />
      {label && (
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      )}
    </div>
  );
};

/**
 * Page loader for full page loading states
 */
interface PageLoaderProps {
  message?: string;
  className?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({
  message,
  className,
}) => {
  return (
    <div className={cn('min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900', className)}>
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" color="primary" />
        {message ? (
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{message}</p>
        ) : null}
      </div>
    </div>
  );
};

/**
 * Table loader for table loading states
 */
interface TableLoaderProps {
  colSpan?: number;
  message?: string;
}

export const TableLoader: React.FC<TableLoaderProps> = ({
  colSpan = 1,
  message = 'Loading data...',
}) => {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12">
        <div className="flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" color="primary" />
          <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
        </div>
      </td>
    </tr>
  );
};

/**
 * Form submission loader (inline)
 */
interface FormLoaderProps {
  message?: string;
}

export const FormLoader: React.FC<FormLoaderProps> = ({
  message = 'Saving...',
}) => {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <Spinner size="sm" color="primary" />
      <span>{message}</span>
    </div>
  );
};

/**
 * Button loader (for button loading states)
 */
export const ButtonLoader: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'sm' }) => {
  return <Spinner size={size} color="current" />;
};





