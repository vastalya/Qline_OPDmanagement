'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

/**
 * /verify-email page (with token param)
 * 
 * Functionality:
 * - Automatic token verification on mount
 * - Status card showing result
 * - Resend verification link option
 * - Cooldown timer on resend
 * 
 * API: GET /api/auth/verify-email?token=...
 *      POST /api/auth/verify-email/resend
 */
export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [state, setState] = useState('verifying'); // verifying, success, error, resent
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const verifyToken = useCallback(async () => {
    try {
      await api.get('/api/auth/verify-email', { params: { token } });

      setState('success');
      setTimeout(() => {
        router.push('/login?message=Email verified successfully');
      }, 3000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to verify email');
      setState('error');
    }
  }, [router, token]);

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setState('error');
      setError('No verification token provided');
    }
  }, [token, verifyToken]);

  const handleResend = async () => {
    if (!email) {
      setError('Email not found. Please register again.');
      return;
    }

    setState('verifying');
    setError('');

    try {
      await api.post('/api/auth/verify-email/resend', { email });

      setState('resent');
      startResendCooldown();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Network error');
      setState('error');
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Email Verification</h1>
          <p className="mt-2 text-gray-600">
            Verifying your email address
          </p>
        </div>

        {/* Verifying State */}
        {state === 'verifying' && (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Verifying your email...</p>
          </div>
        )}

        {/* Success State */}
        {state === 'success' && (
          <div className="rounded-lg bg-green-50 p-6 border border-green-200 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h2 className="font-semibold text-green-800 text-lg">Email Verified</h2>
            <p className="text-sm text-green-700 mt-2">
              Your email has been verified successfully. Redirecting to login...
            </p>
          </div>
        )}

        {/* Error State */}
        {(state === 'error' || state === 'resent' === false) &&
          state !== 'resent' && (
          <div className="rounded-lg bg-red-50 p-6 border border-red-200">
            <h2 className="font-semibold text-red-800">Verification Failed</h2>
            <p className="text-sm text-red-700 mt-1">{error}</p>

            {email && (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-gray-600">
                  Email: <strong>{email}</strong>
                </p>
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="w-full flex justify-center py-2 px-4 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? `Resend available in ${resendCooldown}s`
                    : 'Resend Verification Email'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Resent Confirmation */}
        {state === 'resent' && (
          <div className="rounded-lg bg-blue-50 p-6 border border-blue-200">
            <h2 className="font-semibold text-blue-800">Verification Email Sent</h2>
            <p className="text-sm text-blue-700 mt-2">
              We've sent a new verification email to <strong>{email}</strong>
            </p>
            <p className="text-sm text-blue-700 mt-2">
              Click the link in the email to verify your account.
            </p>
          </div>
        )}

        {/* Footer Links */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            Already verified?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Sign in
            </Link>
          </p>
          {state === 'error' && (
            <p className="text-sm text-gray-600">
              Issues with verification?{' '}
              <Link href="/support" className="font-medium text-blue-600 hover:text-blue-700">
                Contact support
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
