import React from "react";
import { PageMeta } from "../common/PageMeta";
import { cn } from "../../lib/utils";

interface TablePageWrapperProps {
  // Content props
  title?: React.ReactNode;
  pageTitle?: string;
  description?: string;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  table?: React.ReactNode;
  sidebar?: React.ReactNode;
  children?: React.ReactNode; // Fallback for legacy usage

  // Layout configuration
  layout?: "basic" | "filter" | "sidebar";
  compact?: boolean;

  // Styling props
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

/**
 * TablePageWrapper - A flexible layout component for table pages
 * 
 * Supports three layout variants:
 * - basic: Header + Table (default)
 * - filter: Header + Filters + Table
 * - sidebar: Header + Sidebar + Table
 * 
 * @param title - Page title
 * @param pageTitle - Page title as a React node
 * @param description - Page description
 * @param actions - Action buttons (Create, Refresh, etc.)
 * @param filters - Filter components (search, dropdowns, etc.)
 * @param table - Table component
 * @param sidebar - Sidebar content
 * @param layout - Layout variant: "basic" | "filter" | "sidebar"
 * @param compact - Reduces spacing for dense layouts
 * @param children - Legacy support for existing implementations
 */
export const TablePageWrapper: React.FC<TablePageWrapperProps> = ({
  pageTitle,
  title,
  description,
  actions,
  filters,
  table,
  sidebar,
  children,
  layout = "basic",
  compact = false,
  className,
  headerClassName,
  contentClassName,
}) => {
  // Determine spacing based on compact mode
  const spacing = compact ? "space-y-4 pb-6" : "space-y-4 pb-8";
  const headerPadding = compact ? "p-4" : "p-4 md:p-6";
  const contentPadding = compact ? "p-2" : "";

  // Render header section
  const renderHeader = () => {
    if (!title && !description && !actions) return null;

    return (
      <div className={cn(
        "bg-white dark:bg-gray-800  shadow-sm border border-gray-200 dark:border-gray-700",
        headerPadding,
        headerClassName
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {title && (
            <div className="flex-1 min-w-0 text-2xl font-bold">
              {title}
              {description && (
                <p className=" text-gray-500 text-base font-normal">
                  {description}
                </p>
              )}
            </div>
          )}
          {actions && (
            <div className="flex items-center space-x-3 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render filters section
  const renderFilters = () => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className={headerPadding}>
          {filters}
        </div>
      </div>
    );
  };

  // Render table section
  const renderTable = () => {
    const tableContent = table || children;
    if (!tableContent) return null;

    return (
      <div className={cn(
        "bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden",
        compact ? "mb-6" : "mb-8",
        contentClassName
      )}>
        <div className={contentPadding}>
          {tableContent}
        </div>
      </div>
    );
  };

  // Render sidebar section
  const renderSidebar = () => {
    if (!sidebar) return null;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className={headerPadding}>
          {sidebar}
        </div>
      </div>
    );
  };

  // Layout-specific rendering
  const renderLayout = () => {
    switch (layout) {
      case "filter":
        return (
          <>
            {renderHeader()}
            {renderFilters()}
            {renderTable()}
          </>
        );

      case "sidebar":
        return (
          <>
            {renderHeader()}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                {renderSidebar()}
              </div>
              <div className="lg:col-span-3">
                {renderTable()}
              </div>
            </div>
          </>
        );

      case "basic":
      default:
        return (
          <>
            {renderHeader()}
            {renderTable()}
          </>
        );
    }
  };

  return (
    <div className={cn(spacing, className)}>
      <PageMeta title={pageTitle ?? ""} description={description} />
      {renderLayout()}
    </div>
  );
};

// Legacy support - keep existing interface for backward compatibility
interface LegacyTablePageWrapperProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

/**
 * @deprecated Use the new TablePageWrapper with layout props instead
 */
export const LegacyTablePageWrapper: React.FC<LegacyTablePageWrapperProps> = (props) => {
  return <TablePageWrapper {...props} layout="basic" />;
};
