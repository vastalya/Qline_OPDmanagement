'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

/**
 * /support - Support and help page
 * 
 * Functionality:
 * - FAQ section
 * - Contact/ticket form
 * - Issue category selector
 * - Email submission
 */
export default function SupportPage() {
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [issueForm, setIssueForm] = useState({
    category: 'general',
    subject: '',
    description: '',
    email: '',
  });
  const [submitState, setSubmitState] = useState('idle'); // idle, loading, success, error
  const [submitError, setSubmitError] = useState('');

  const faqItems = [
    {
      id: 1,
      question: 'How do I book an appointment?',
      answer: 'As a patient, navigate to "Find Doctors", select your preferred doctor and date/time, and confirm the booking. You\'ll receive a confirmation email.'
    },
    {
      id: 2,
      question: 'How can I reschedule my appointment?',
      answer: 'Go to "My Appointments", select the appointment, and click "Reschedule". Choose a new date/time and confirm.'
    },
    {
      id: 3,
      question: 'How does the queue system work?',
      answer: 'When your appointment time arrives, join the virtual queue from "Queue Tracker". You\'ll see your position and estimated wait time. A notification will alert you when approaching your turn.'
    },
    {
      id: 4,
      question: 'What should I do if I miss my appointment?',
      answer: 'Contact support as soon as possible. Depending on your plan, you may be able to reschedule. Repeated no-shows may affect your booking privileges.'
    },
    {
      id: 5,
      question: 'How do I access my medical records?',
      answer: 'Patients can view consultation records in "Medical Records" after appointments are completed. Doctors can upload records during the appointment.'
    },
    {
      id: 6,
      question: 'Is my data secure and private?',
      answer: 'Yes, Qline implements encryption and follows HIPAA standards where applicable. See our Privacy Policy for details.'
    },
    {
      id: 7,
      question: 'How do I reset my password?',
      answer: 'Click "Forgot Password" on the login page, enter your email, and follow the reset link sent to you.'
    },
    {
      id: 8,
      question: 'Can I receive appointment reminders?',
      answer: 'Yes, manage your notification preferences in Settings > Notifications. You can choose email, SMS, or in-app alerts.'
    }
  ];

  const categories = [
    { value: 'general', label: 'General Question' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'appointment', label: 'Appointment Issue' },
    { value: 'account', label: 'Account & Login' },
    { value: 'data', label: 'Data & Privacy' },
    { value: 'other', label: 'Other' },
  ];

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setIssueForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitState('loading');
    setSubmitError('');

    try {
      await api.post('/api/support/create-ticket', issueForm);

      setSubmitState('success');
      setIssueForm({
        category: 'general',
        subject: '',
        description: '',
        email: '',
      });

      setTimeout(() => {
        setSubmitState('idle');
      }, 5000);
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err.message || 'Network error');
      setSubmitState('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Help & Support</h1>
          <p className="mt-2 text-gray-600">
            Find answers to common questions or contact our support team
          </p>
        </div>

        {/* FAQ Section */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h2 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {faqItems.map((item) => (
              <div key={item.id} className="p-6">
                <button
                  onClick={() =>
                    setExpandedFAQ(expandedFAQ === item.id ? null : item.id)
                  }
                  className="flex items-center justify-between w-full text-left"
                >
                  <h3 className="text-lg font-semibold text-gray-900">
                    {item.question}
                  </h3>
                  <span className={`text-gray-500 transition-transform ${
                    expandedFAQ === item.id ? 'rotate-180' : ''
                  }`}>
                    ▼
                  </span>
                </button>

                {expandedFAQ === item.id && (
                  <p className="mt-4 text-gray-600">{item.answer}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Contact Form Section */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h2 className="text-2xl font-bold text-gray-900">Contact Support</h2>
            <p className="text-sm text-gray-600 mt-1">
              Can't find the answer? Submit a support ticket
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
            {/* Success Message */}
            {submitState === 'success' && (
              <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                <h3 className="font-semibold text-green-800">Ticket Submitted</h3>
                <p className="text-sm text-green-700 mt-1">
                  Thank you for contacting us. You'll receive a response within 24 hours.
                </p>
              </div>
            )}

            {/* Error Message */}
            {submitState === 'error' && (
              <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}

            {submitState !== 'success' && (
              <>
                {/* Category */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Issue Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={issueForm.category}
                    onChange={handleFormChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                    Subject
                  </label>
                  <input
                    id="subject"
                    type="text"
                    name="subject"
                    value={issueForm.subject}
                    onChange={handleFormChange}
                    required
                    placeholder="Brief description of your issue"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={submitState === 'loading'}
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={issueForm.description}
                    onChange={handleFormChange}
                    required
                    rows={5}
                    placeholder="Please provide detailed information about your issue..."
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={submitState === 'loading'}
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={issueForm.email}
                    onChange={handleFormChange}
                    required
                    placeholder="your@email.com"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={submitState === 'loading'}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitState === 'loading'}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitState === 'loading' ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </>
            )}
          </form>
        </section>

        {/* Additional Resources */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Additional Resources</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/terms"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <h3 className="font-semibold text-gray-900">Terms of Service</h3>
              <p className="text-sm text-gray-600 mt-1">Review our terms and conditions</p>
            </Link>
            <Link
              href="/privacy"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <h3 className="font-semibold text-gray-900">Privacy Policy</h3>
              <p className="text-sm text-gray-600 mt-1">Learn how we protect your data</p>
            </Link>
          </div>
        </section>

        {/* Quick Contact */}
        <section className="bg-blue-50 rounded-lg border border-blue-200 p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900">Need Immediate Help?</h2>
          <p className="text-gray-600 mt-2">
            Email us at{' '}
            <a href="mailto:support@qline.com" className="text-blue-600 hover:text-blue-700 font-medium">
              support@qline.com
            </a>
            {' '}or call{' '}
            <a href="tel:+1234567890" className="text-blue-600 hover:text-blue-700 font-medium">
              +1 (234) 567-890
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
