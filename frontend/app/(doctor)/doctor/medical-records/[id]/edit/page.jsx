'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'

export default function DoctorEditMedicalRecordPage({ params }) {
    const { id } = params
    const router = useRouter()
    const toast = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showDelete, setShowDelete] = useState(false)
    const [form, setForm] = useState({ chiefComplaint: '', symptoms: '', diagnosis: '', notes: '' })
    const [medications, setMedications] = useState([])
    const [vitals, setVitals] = useState({ bp: '', temp: '', hr: '', weight: '', height: '' })

    useEffect(() => {
        api.get(`/api/medical-records/${id}`)
            .then(r => {
                const rec = r.data?.record ?? r.data?.data ?? r.data
                setForm({
                    chiefComplaint: rec.chiefComplaint ?? '',
                    symptoms: Array.isArray(rec.symptoms) ? rec.symptoms.join(', ') : (rec.symptoms ?? ''),
                    diagnosis: rec.diagnosis ?? '',
                    notes: rec.notes ?? '',
                })
                setMedications(rec.medications ?? [])
                setVitals(rec.vitals ?? { bp: '', temp: '', hr: '', weight: '', height: '' })
            })
            .catch(() => toast.error('Failed to load record'))
            .finally(() => setLoading(false))
    }, [id, toast])

    const setField = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))
    const setVital = (key) => (e) => setVitals(p => ({ ...p, [key]: e.target.value }))

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            await api.patch(`/api/medical-records/${id}`, {
                ...form,
                symptoms: form.symptoms ? form.symptoms.split(',').map(s => s.trim()) : [],
                medications,
                vitals,
            })
            toast.success('Record updated')
            router.back()
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to update record')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" className="text-primary" /></div>

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="text-h1 text-text-primary">Edit Medical Record</h1>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>Consultation Details</CardTitle></CardHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-caption text-text-secondary mb-1">Chief Complaint *</label>
                            <textarea value={form.chiefComplaint} onChange={setField('chiefComplaint')} rows={2} required
                                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-body text-text-primary resize-none focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none" />
                        </div>
                        <div>
                            <label className="block text-caption text-text-secondary mb-1">Symptoms (comma-separated)</label>
                            <Input value={form.symptoms} onChange={setField('symptoms')} />
                        </div>
                        <div>
                            <label className="block text-caption text-text-secondary mb-1">Diagnosis</label>
                            <Input value={form.diagnosis} onChange={setField('diagnosis')} />
                        </div>
                        <div>
                            <label className="block text-caption text-text-secondary mb-1">Notes</label>
                            <textarea value={form.notes} onChange={setField('notes')} rows={3}
                                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-body text-text-primary resize-none focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none" />
                        </div>
                    </div>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Vitals</CardTitle></CardHeader>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {[['bp', 'Blood Pressure'], ['temp', 'Temperature'], ['hr', 'Heart Rate'], ['weight', 'Weight (kg)'], ['height', 'Height (cm)']].map(([key, label]) => (
                            <div key={key}>
                                <label className="block text-caption text-text-secondary mb-1">{label}</label>
                                <Input value={vitals[key] ?? ''} onChange={setVital(key)} placeholder={label} />
                            </div>
                        ))}
                    </div>
                </Card>

                <div className="flex justify-between items-center">
                    <Button type="button" variant="danger" onClick={() => setShowDelete(true)}>Delete Record</Button>
                    <div className="flex gap-3">
                        <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
                        <Button type="submit" loading={saving}>Save Changes</Button>
                    </div>
                </div>
            </form>

            {showDelete && (
                <Modal isOpen onClose={() => setShowDelete(false)} title="Delete Medical Record?">
                    <p className="text-body text-text-secondary mb-4">This action cannot be undone.</p>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Button>
                        <Button variant="danger" onClick={async () => {
                            try {
                                await api.patch(`/api/medical-records/${id}`, { deleted: true })
                                toast.success('Record deleted')
                                router.push('/doctor/appointments')
                            } catch { toast.error('Failed to delete') }
                        }}>Delete</Button>
                    </div>
                </Modal>
            )}
        </div>
    )
}
