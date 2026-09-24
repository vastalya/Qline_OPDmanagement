'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

/**
 * /reset-password page (with token param)
 * 
 * Functionality:
 * - Token validation on mount
 * - New password + confirm password fields
 * - Password strength meter
 * - Real-time validation feedback
 * - Success redirect to login
 * 
 * API: POST /api/auth/reset-password
 * Body: { token: string, password: string }
 * Response: { message: string }
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [state, setState] = useState('validating'); // validating, idle, loading, success, error
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0); // 0-4

  const validateToken = useCallback(async () => {
    if (!token) {
      setError('Invalid or missing reset token');
      setState('error');
      return;
    }

    try {
      await api.get(`/api/auth/reset-password/validate?token=${token}`);
      setState('idle');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Reset link has expired or is invalid';
      setError(msg);
      setState('error');
    }
  }, [token]);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  const calculatePasswordStrength = (pwd) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z\d]/.test(pwd)) strength++;
    return strength;
  };

  const handlePasswordChange = (e) => {
    const pwd = e.target.value;
    setPassword(pwd);
    setPasswordStrength(calculatePasswordStrength(pwd));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordStrength < 2) {
      setError('Password is too weak. Use at least 8 characters with mixed case and numbers.');
      return;
    }

    setState('loading');

    try {
      await api.post('/api/auth/reset-password', { token, password });
      setState('success');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to reset password';
      setError(msg);
      setState('idle');
    }
  };

  const getStrengthColor = (strength) => {
    switch (strength) {
      case 0:
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-yellow-500';
      case 3:
        return 'bg-blue-500';
      case 4:
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Create New Password</h1>
          <p className="mt-2 text-gray-600">
            Enter your new password below
          </p>
        </div>

        {/* Validating State */}
        {state === 'validating' && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Token Error State */}
        {state === 'error' && !token && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
            <Link href="/forgot-password" className="text-sm text-red-600 hover:text-red-700 font-medium mt-2 block">
              Request a new reset link
            </Link>
          </div>
        )}

        {/* Success State */}
        {state === 'success' && (
          <div className="rounded-lg bg-green-50 p-4 border border-green-200">
            <h2 className="font-semibold text-green-800">Password reset successful</h2>
            <p className="text-sm text-green-700 mt-1">
              Redirecting to login...
            </p>
          </div>
        )}

        {/* Form - Show only in idle/loading */}
        {state === 'idle' || state === 'loading' ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Messages */}
            {error && (
              <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* New Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={handlePasswordChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
                disabled={state === 'loading'}
              />

              {/* Password Strength Meter */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">Strength</span>
                    <span className="text-gray-600">
                      {passwordStrength === 0 && 'Very Weak'}
                      {passwordStrength === 1 && 'Weak'}
                      {passwordStrength === 2 && 'Fair'}
                      {passwordStrength === 3 && 'Good'}
                      {passwordStrength === 4 && 'Strong'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getStrengthColor(passwordStrength)} transition-all`}
                      style={{ width: `${(passwordStrength / 4) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Use at least 8 characters with uppercase, lowercase, numbers, and symbols.
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
                disabled={state === 'loading'}
              />
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-600 mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={
                state === 'loading' ||
                !password ||
                !confirmPassword ||
                password !== confirmPassword ||
                passwordStrength < 2
              }
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state === 'loading' ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        ) : null}

        {/* Footer Links */}
        <div className="text-center">
          <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
