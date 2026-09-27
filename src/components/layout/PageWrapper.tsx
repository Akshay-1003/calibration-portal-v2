import * as React from "react"
import { cn } from "../../lib/utils"
import { PageMeta } from "../common/PageMeta"

interface PageWrapperProps {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
  actions?: React.ReactNode
}

export function PageWrapper({
  children,
  className,
  title,
  description,
  actions,
}: PageWrapperProps) {
  return (
    <div className={cn("flex flex-col h-full gap-4", className)}>
      <PageMeta title={title} description={description} />
      {(title || description || actions) && (
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="space-y-1">
            {title && (
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className="flex-1 min-h-0 animate-fade-in">
        {children}
      </div>
    </div>
  )
}

interface TablePageWrapperProps extends PageWrapperProps {
  searchComponent?: React.ReactNode
}

export function TablePageWrapper({
  children,
  className,
  title,
  description,
  actions,
  searchComponent,
}: TablePageWrapperProps) {
  return (
    <PageWrapper
      title={title}
      description={description}
      actions={actions}
      className={className}
    >
      <div className="flex flex-col h-full gap-4">
        {searchComponent && (
          <div className="bg-card rounded-lg border p-4 shadow-sm flex-shrink-0">
            {searchComponent}
          </div>
        )}
        <div className="bg-card rounded-lg border shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
          {children}
        </div>
      </div>
    </PageWrapper>
  )
}

interface FormPageWrapperProps {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
  actions?: React.ReactNode
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl" | "7xl" | "full"
}

export function FormPageWrapper({
  children,
  className,
  actions,
  maxWidth = "7xl",
}: FormPageWrapperProps) {
  void actions;
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
    full: "max-w-full",
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className={cn("mx-auto py-2", maxWidthClasses[maxWidth], className)}>
       
        <div className="animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  )
}
