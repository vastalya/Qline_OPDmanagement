'use client'

import { useState } from 'react'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const FAQ = [
    { q: 'How do I reset a doctor\'s password?', a: 'Use the Users page to find the user and ask them to use the "Forgot Password" flow. Admin password resets require direct DB access for security.' },
    { q: 'How do I add a new doctor?', a: 'Ask the doctor to register via the app. After registration, their account will appear in the Users list where you can review it.' },
    { q: 'Live queues are not showing up?', a: 'Queues are generated when a doctor first calls the next patient. Ensure the doctor has configured their schedule and at least one appointment is booked for today.' },
    { q: 'How do I export data?', a: 'Visit the Reports page to generate a date-range report and download it as a CSV file.' },
]

export default function AdminSupportPage() {
    const toast = useToast()
    const [report, setReport] = useState({ title: '', description: '', severity: 'low' })
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const submit = async (e) => {
        e.preventDefault()
        setSubmitting(true)
        await new Promise(r => setTimeout(r, 500))
        setSubmitted(true)
        toast.success('Incident report submitted')
        setSubmitting(false)
    }

    const setField = (key) => (e) => setReport(p => ({ ...p, [key]: e.target.value }))

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="text-h1 text-text-primary">Support</h1>
                <p className="text-body text-text-secondary">Frequently asked questions and incident reporting</p>
            </div>

            <Card>
                <CardHeader><CardTitle>FAQ</CardTitle></CardHeader>
                <div className="space-y-4">
                    {FAQ.map((item, i) => (
                        <div key={i} className="border-b border-border last:border-0 pb-4 last:pb-0">
                            <p className="text-body font-semibold text-text-primary">{item.q}</p>
                            <p className="text-body text-text-secondary mt-1">{item.a}</p>
                        </div>
                    ))}
                </div>
            </Card>

            <Card>
                <CardHeader><CardTitle>Report an Incident</CardTitle></CardHeader>
                {submitted ? (
                    <div className="py-8 text-center">
                        <p className="text-h2">✅</p>
                        <p className="text-body font-semibold text-text-primary mt-2">Report Submitted</p>
                        <p className="text-body text-text-secondary mt-1">The system team will respond within 24 hours.</p>
                        <Button variant="secondary" size="sm" className="mt-4" onClick={() => setSubmitted(false)}>Submit Another</Button>
                    </div>
                ) : (
                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="block text-caption text-text-secondary mb-1">Issue Title</label>
                            <Input value={report.title} onChange={setField('title')} placeholder="Brief description" required />
                        </div>
                        <div>
                            <label className="block text-caption text-text-secondary mb-1">Severity</label>
                            <select value={report.severity} onChange={setField('severity')}
                                className="w-full h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none">
                                <option value="low">Low – Minor issue, workaround exists</option>
                                <option value="medium">Medium – Feature impacted but system is functional</option>
                                <option value="high">High – Major feature broken</option>
                                <option value="critical">Critical – System down</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-caption text-text-secondary mb-1">Description</label>
                            <textarea value={report.description} onChange={setField('description')} rows={4} required
                                placeholder="Steps to reproduce, expected vs actual behavior..."
                                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-body text-text-primary resize-none focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none" />
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" loading={submitting}>Submit Report</Button>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    )
}
