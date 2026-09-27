import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { toast } from "sonner";

const SIDEBAR_PREFERENCE_KEY = "sidebar-preference";

export type SidebarType = "classic" | "shadcn";

export function SidebarToggle() {
  const [sidebarType, setSidebarType] = useState<SidebarType>(() => {
    const saved = localStorage.getItem(SIDEBAR_PREFERENCE_KEY);
    return (saved as SidebarType) || "classic";
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_PREFERENCE_KEY, sidebarType);
  }, [sidebarType]);

  const handleSwitch = (type: SidebarType) => {
    setSidebarType(type);
    toast.success(`Switched to ${type === "classic" ? "Classic" : "Shadcn"} Sidebar`, {
      description: "Please refresh the page to see the changes.",
      action: {
        label: "Refresh",
        onClick: () => window.location.reload(),
      },
    });
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Sidebar Style</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Choose between the classic sidebar or the new Shadcn sidebar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Classic Sidebar Card */}
          <div
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              sidebarType === "classic"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => handleSwitch("classic")}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium">Classic Sidebar</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Current production sidebar
                </p>
              </div>
              {sidebarType === "classic" && (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  ✓
                </div>
              )}
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Accordion-based navigation</li>
              <li>• Hover to expand (desktop)</li>
              <li>• HeroUI components</li>
              <li>• Current implementation</li>
            </ul>
          </div>

          {/* Shadcn Sidebar Card */}
          <div
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              sidebarType === "shadcn"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => handleSwitch("shadcn")}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium">Shadcn Sidebar</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Modern collapsible sidebar
                </p>
              </div>
              {sidebarType === "shadcn" && (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  ✓
                </div>
              )}
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Collapsible icon mode</li>
              <li>• Keyboard shortcuts (Cmd+B)</li>
              <li>• Persistent state (cookies)</li>
              <li>• Mobile sheet overlay</li>
              <li>• Tooltips when collapsed</li>
            </ul>
            <div className="mt-3 pt-3 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open("/demo/shadcn-sidebar", "_blank");
                }}
              >
                View Demo
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
          <div className="text-blue-600 dark:text-blue-400 mt-0.5">ℹ️</div>
          <div className="flex-1 text-xs">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Switching sidebars requires a page refresh
            </p>
            <p className="text-blue-700 dark:text-blue-300">
              Your current sidebar preference: <strong>{sidebarType === "classic" ? "Classic" : "Shadcn"}</strong>
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Hook to get current sidebar preference
export function useSidebarPreference(): SidebarType {
  const [sidebarType, setSidebarType] = useState<SidebarType>(() => {
    const saved = localStorage.getItem(SIDEBAR_PREFERENCE_KEY);
    return (saved as SidebarType) || "classic";
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem(SIDEBAR_PREFERENCE_KEY);
      setSidebarType((saved as SidebarType) || "classic");
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return sidebarType;
}

