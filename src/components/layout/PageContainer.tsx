import React from "react";
import { cn } from "../../lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  withPadding?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className,
  withPadding = true
}) => {
  return (
    <div className={cn(
      "min-h-screen",
      withPadding, // Ensure enough bottom padding to prevent footer overlap
      className
    )}>
      {children}
    </div>
  );
};

interface TableContainerProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
  minHeight?: string;
}

export const TableContainer: React.FC<TableContainerProps> = ({
  children,
  className,
  maxHeight = "calc(100vh-300px)",
  minHeight = "400px"
}) => {
  return (
    <div className={cn(
      "relative overflow-auto border rounded-lg bg-white shadow-sm",
      className
    )} style={{ maxHeight, minHeight }}>
      {children}
    </div>
  );
};

interface ResponsiveTableWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveTableWrapper: React.FC<ResponsiveTableWrapperProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn("p-4 pb-8 mb-8", className)}>
      {children}
    </div>
  );
};