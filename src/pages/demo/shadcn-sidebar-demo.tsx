import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useNavigate } from "react-router-dom";

export default function ShadcnSidebarDemo() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shadcn Sidebar Demo</h1>
        <p className="text-muted-foreground mt-2">
          This page is using the new Shadcn/UI sidebar component with collapsible icon mode.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Collapsible Sidebar</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Click the toggle button in the header or hover over the collapsed sidebar to expand it.
          </p>
          <div className="flex gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
              <span className="text-xs font-medium">✓</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium">Icon Mode</p>
              <p className="text-xs text-muted-foreground">Collapses to icons</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Grouped Navigation</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Navigation items are organized into logical groups with labels.
          </p>
          <div className="flex gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
              <span className="text-xs font-medium">✓</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium">Organized</p>
              <p className="text-xs text-muted-foreground">Easy to navigate</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Responsive Design</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Works seamlessly on desktop and mobile devices with a sheet overlay.
          </p>
          <div className="flex gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
              <span className="text-xs font-medium">✓</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium">Mobile Ready</p>
              <p className="text-xs text-muted-foreground">Sheet on mobile</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Key Features</h2>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span className="text-sm">
              <strong>Keyboard Shortcut:</strong> Press <kbd className="px-2 py-1 text-xs bg-muted rounded">Cmd/Ctrl + B</kbd> to toggle the sidebar
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span className="text-sm">
              <strong>Collapsible Groups:</strong> Click on navigation items with sub-items to expand/collapse them
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span className="text-sm">
              <strong>Active State:</strong> Current page is highlighted automatically with proper nested item detection
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span className="text-sm">
              <strong>Tooltips:</strong> When collapsed, hover over icons to see tooltip labels
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span className="text-sm">
              <strong>Persistent State:</strong> Sidebar state is saved in cookies and persists across sessions
            </span>
          </li>
        </ul>
      </Card>

      <div className="flex gap-4">
        <Button onClick={() => navigate("/dashboard")}>
          Go to Dashboard
        </Button>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    </div>
  );
}

