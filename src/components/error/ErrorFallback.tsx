import React from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon, HomeIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/button';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  retryCount?: number;
  maxRetries?: number;
  showDetails?: boolean;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  retryCount = 0,
  maxRetries = 3,
  showDetails = false,
}) => {
  const handleRetry = () => {
    if (retryCount < maxRetries) {
      resetError();
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>

          {/* Error Title */}
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Something went wrong
          </h1>

          {/* Error Message */}
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleRetry}
              className="w-full"
              disabled={retryCount >= maxRetries}
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              {retryCount >= maxRetries ? 'Max Retries Reached' : 'Try Again'}
            </Button>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleReload}
                className="flex-1"
              >
                Reload Page
              </Button>
              <Button
                variant="outline"
                onClick={handleGoHome}
                className="flex-1"
              >
                <HomeIcon className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>
          </div>

          {/* Error Details */}
          {showDetails && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Error Details
              </summary>
              <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 text-xs font-mono overflow-auto max-h-40">
                <div className="mb-2">
                  <strong>Error:</strong> {error.message}
                </div>
                {error.stack && (
                  <div>
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap mt-1">{error.stack}</pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;
