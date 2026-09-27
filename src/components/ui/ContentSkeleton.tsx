// src/components/ui/ContentSkeleton.tsx
import React from 'react';

const ContentSkeleton: React.FC = () => {
  return (
    <div className="w-full h-full p-4 animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mt-2"></div>
      </div>

      {/* Content Box Skeleton */}
      <div className="space-y-6">
        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    </div>
  );
};

export default ContentSkeleton;
