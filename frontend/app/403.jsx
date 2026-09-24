'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 403 Unauthorized page
 * 
 * Functionality:
 * - User doesn't have permission to access resource
 * - Show current role
 * - Provide navigation back to role dashboard
 */
export default function UnauthorizedPage() {
  const { user } = useAuth();

  const getRolePath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'patient':
        return '/patient/dashboard';
      case 'doctor':
        return '/doctor/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-6xl font-bold text-gray-900">403</h1>
          <p className="mt-4 text-2xl font-semibold text-gray-900">Access Denied</p>
          <p className="mt-2 text-gray-600">
            You don't have permission to access this resource.
          </p>
        </div>

        {user && (
          <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
            <p className="text-sm text-blue-700">
              Current role: <strong>{user.role}</strong>
            </p>
            <p className="text-xs text-blue-600 mt-1">
              If you believe you should have access, please contact support.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href={getRolePath()}
            className="block w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Back to Dashboard
          </Link>

          <Link
            href="/"
            className="block w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
          >
            Go Home
          </Link>
        </div>

        <p className="text-sm text-gray-600">
          Need assistance?{' '}
          <Link href="/support" className="text-blue-600 hover:text-blue-700 font-medium">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
