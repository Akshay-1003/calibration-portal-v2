/**
 * Unauthorized Page
 * Shown when user doesn't have required permissions
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '@heroui/react';
import { ShieldX } from 'lucide-react';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <ShieldX className="mx-auto h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Access Denied
        </h1>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this resource.
        </p>
        <Button
          variant="primary"
          onPress={() => navigate(-1)}
        >
          Go Back
        </Button>
      </div>
    </div>
  );
};





