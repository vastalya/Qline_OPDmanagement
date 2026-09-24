'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

/**
 * 500 Server Error page
 * 
 * Functionality:
 * - Recoverable error display
 * - Retry button
 * - Report issue option
 * - Navigate to home
 */
export default function ServerErrorPage() {
  const [reportSent, setReportSent] = useState(false);
  const [reporting, setReporting] = useState(false);

  const handleRetry = () => {
    window.location.reload();
  };

  const handleReport = async () => {
    setReporting(true);
    try {
      await api.post('/api/errors/report', {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
      setReportSent(true);
    } catch (err) {
      console.error('Failed to report error:', err);
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-6xl font-bold text-gray-900">500</h1>
          <p className="mt-4 text-2xl font-semibold text-gray-900">Server Error</p>
          <p className="mt-2 text-gray-600">
            Something went wrong on our end. Our team has been notified.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleRetry}
            className="block w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Try Again
          </button>

          <Link
            href="/"
            className="block w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
          >
            Go Home
          </Link>
        </div>

        <div className="border-t border-gray-300 pt-6">
          {reportSent ? (
            <div className="rounded-lg bg-green-50 p-3 border border-green-200">
              <p className="text-sm text-green-700">
                Thank you for reporting this issue. We'll look into it shortly.
              </p>
            </div>
          ) : (
            <button
              onClick={handleReport}
              disabled={reporting}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reporting ? 'Reporting...' : 'Report this issue'}
            </button>
          )}
        </div>

        <p className="text-sm text-gray-600">
          Still having issues?{' '}
          <Link href="/support" className="text-blue-600 hover:text-blue-700 font-medium">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
