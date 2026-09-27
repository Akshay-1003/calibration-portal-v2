/**
 * SidebarSkeleton Component
 * Loading state for sidebar during initialization
 * Shows while auth, router, and layout are loading
 */

import { Skeleton } from '@heroui/react';

interface SidebarSkeletonProps {
  isExpanded?: boolean;
}

export const SidebarSkeleton: React.FC<SidebarSkeletonProps> = ({ 
  isExpanded = true 
}) => {
  return (
    <aside
      className={`fixed inset-y-0 left-0 flex flex-col bg-card border-r border-border shadow-lg h-screen ${
        isExpanded ? 'w-[280px] pl-4 pr-2' : 'w-[80px] px-4'
      }`}
    >
      {/* Logo Skeleton */}
      <div className="py-6 flex items-center justify-start">
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Navigation Skeleton */}
      <div className="flex-1 overflow-hidden px-2">
        <div className="space-y-2">
          {/* Menu Label */}
          <Skeleton className="h-4 w-16 rounded mb-4" />

          {/* Menu Items */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-10 w-full rounded-lg" />
              {i % 2 === 0 && (
                <div className="ml-4 space-y-1">
                  <Skeleton className="h-8 w-full rounded-md" />
                  <Skeleton className="h-8 w-full rounded-md" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Section Skeleton */}
      <div className="mt-auto border-t border-border/60 p-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          {isExpanded && (
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-2 w-16 rounded" />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};





