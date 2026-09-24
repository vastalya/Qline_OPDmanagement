'use client';

/**
 * /maintenance - Planned downtime page
 * Static content page
 */
export default function MaintenancePage() {
  const resumeTime = new Date('2026-03-04T06:00:00Z');
  const now = new Date();
  const minutesRemaining = Math.max(0, Math.floor((resumeTime - now) / 1000 / 60));
  const hoursRemaining = Math.floor(minutesRemaining / 60);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-yellow-100 p-4">
            <svg
              className="h-8 w-8 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Maintenance in Progress</h1>
          <p className="text-gray-600 mt-2">
            We're performing scheduled maintenance to improve your experience.
          </p>
        </div>

        {/* Status */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm font-medium text-yellow-800">
            Expected to resume in approximately{' '}
            <strong>{hoursRemaining > 0 ? `${hoursRemaining}h` : ''} {minutesRemaining % 60}m</strong>
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            {resumeTime.toLocaleString()} (UTC)
          </p>
        </div>

        {/* Details */}
        <div className="text-left space-y-2 text-sm text-gray-600">
          <p>✓ Your data is safe</p>
          <p>✓ No action required from you</p>
          <p>✓ You'll be notified when we're back</p>
        </div>

        {/* Support */}
        <div className="border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-600">
            For urgent issues, contact{' '}
            <a href="mailto:support@qline.com" className="text-blue-600 hover:text-blue-700 font-medium">
              support@qline.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
