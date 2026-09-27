import React, { Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { SidebarProvider, SidebarInset } from '../../../components/ui/sidebar';
import ContentSkeleton from '../../../components/ui/ContentSkeleton';

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

const AppSidebar = React.lazy(() =>
  import('../../../layout/AppSidebar').then((module) => ({ default: module.AppSidebar }))
);

function ProtectedShell() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen bg-slate-50 w-full">
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-5">
          <div className="h-10 w-40 rounded-md bg-slate-200 animate-pulse" />
          <div className="mt-8 space-y-3">
            <div className="h-10 rounded-lg bg-slate-200 animate-pulse" />
            <div className="h-10 rounded-lg bg-slate-200 animate-pulse" />
            <div className="h-10 rounded-lg bg-slate-200 animate-pulse" />
            <div className="h-10 rounded-lg bg-slate-200 animate-pulse" />
          </div>
        </aside>
        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-2">
            <ContentSkeleton />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

/**
 * ProtectedLayout - Production-grade layout protection
 * 
 * Protects the entire application layout and handles authentication routing.
 * This ensures no protected components render until auth is properly initialized.
 */
function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { isInitialized, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isInitialized) {
    return <ProtectedShell />;
  }

  if (!isAuthenticated) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen bg-slate-50 w-full">
        <Suspense fallback={<div className="w-14 shrink-0" />}>
          <AppSidebar />
        </Suspense>
        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-2">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default ProtectedLayout;
