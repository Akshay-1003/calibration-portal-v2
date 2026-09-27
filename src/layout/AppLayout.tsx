import { Outlet } from "react-router";
import { Suspense } from "react";
import OutletSkeleton from "./Skeleton";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "../components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import RouteTransitionLoader from "../components/ui/RouteTransitionLoader";

const AppLayout: React.FC = () => {
  // Default open on desktop (lg+), closed on mobile
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
  
  return (
    <SidebarProvider defaultOpen={isDesktop}>
      {/* Route Transition Loader - Shows on all route changes */}
      <RouteTransitionLoader />
      
      <div className="flex h-screen w-screen overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
          <div className="fixed left-4 top-4 z-[100] lg:hidden">
            <SidebarTrigger
              aria-label="Toggle sidebar menu"
              className="h-11 w-11 rounded-lg border-2 border-slate-300 bg-white shadow-xl hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-95"
            />
          </div>
          <main className="flex-1 overflow-auto bg-muted/10">
            <div className="container mx-auto md:p-4 max-w-full">
              <Suspense fallback={<OutletSkeleton />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
