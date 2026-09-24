'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

/**
 * /forgot-password page
 * 
 * Functionality:
 * - Email input for password reset request
 * - Cooldown timer for resend button
 * - Loading state during submission
 * - Success message
 * - Error handling and display
 * 
 * API: POST /api/auth/forgot-password
 * Body: { email: string }
 * Response: { message: string }
 */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle, loading, sent, error
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setState('loading');
    setError('');

    try {
      await api.post('/api/auth/forgot-password', { email });
      setState('sent');
      startResendCooldown();
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to send reset link';
      setError(msg);
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

  const handleResend = async () => {
    setState('loading');
    setError('');

    try {
      await api.post('/api/auth/forgot-password', { email });
      setState('sent');
      startResendCooldown();
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to resend reset link';
      setError(msg);
      setState('error');
    }
  };

  return (
    <Card className="p-8 space-y-6 max-w-md mx-auto my-20">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-h1 text-primary font-semibold">Reset Password</h1>
        <p className="text-body text-text-secondary">
          Enter your email to receive a reset link
        </p>
      </div>

      {/* Success State */}
      {state === 'sent' && (
        <div className="bg-success-light border border-success rounded p-4 space-y-2">
          <h2 className="font-semibold text-success">Check your email</h2>
          <p className="text-sm text-text-primary">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
        </div>
      )}

      {/* Error State */}
      {state === 'error' && (
        <div className="bg-error-light border border-error rounded p-4">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Form */}
      {state !== 'sent' && (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={state === 'loading'}
            required
          />

          <Button
            type="submit"
            fullWidth
            loading={state === 'loading'}
            disabled={!email}
          >
            Send Reset Link
          </Button>
        </form>
      )}

      {/* Resend Section */}
      {state === 'sent' && (
        <div className="text-center space-y-4">
          <p className="text-sm text-text-secondary">
            {resendCooldown > 0
              ? `Resend available in ${resendCooldown}s`
              : "Didn't receive the email?"}
          </p>
          <Button
            variant="secondary"
            onClick={handleResend}
            disabled={resendCooldown > 0 || state === 'loading'}
            fullWidth
            loading={state === 'loading'}
          >
            Resend Reset Link
          </Button>
        </div>
      )}

      {/* Footer Links */}
      <div className="text-center space-y-2 text-body text-text-secondary">
        <p>
          Remember your password?{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
        <p>
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Register
          </Link>
        </p>
      </div>
    </Card>
  );
}
