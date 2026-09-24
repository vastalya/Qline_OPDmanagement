'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

/**
 * not-found (404) page
 * 
 * Functionality:
 * - Custom 404 page with product branding
 * - Role-aware quick links
 * - Search suggestion
 * - Back navigation
 */
export default function NotFoundPage() {
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
          <h1 className="text-6xl font-bold text-gray-900">404</h1>
          <p className="mt-4 text-2xl font-semibold text-gray-900">Page Not Found</p>
          <p className="mt-2 text-gray-600">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href={getRolePath()}
            className="block w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Go to Dashboard
          </Link>

          <Link
            href="/"
            className="block w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
          >
            Go Home
          </Link>

          {user?.role === 'patient' && (
            <Link
              href="/doctors"
              className="block w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
            >
              Find Doctors
            </Link>
          )}
        </div>

        <p className="text-sm text-gray-600">
          Need help?{' '}
          <Link href="/support" className="text-blue-600 hover:text-blue-700 font-medium">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
