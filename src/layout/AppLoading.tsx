import { SidebarProvider } from "../components/ui/sidebar";
import Backdrop from "./Backdrop";
import { AppSidebar } from "./AppSidebar";
import ContentSkeleton from "../components/ui/ContentSkeleton";

const AppLoading: React.FC = () => {
  return (
    <SidebarProvider>
      <div className="h-screen overflow-hidden bg-background">
        <div className="fixed inset-y-0 left-0 z-50">
          <AppSidebar />
        </div>
        <Backdrop />
        <div className="h-screen lg:ml-[80px]">
          <main className="h-full bg-muted/100 overflow-auto">
            <div className="h-full p-4 md:p-4 pt-10 pb-2">
              <ContentSkeleton />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLoading;
