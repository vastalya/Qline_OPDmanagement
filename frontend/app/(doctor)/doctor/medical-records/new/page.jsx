'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const EMPTY_MED = { name: '', dosage: '', frequency: '', duration: '' }
const EMPTY_LAB = { name: '', notes: '' }

export default function DoctorNewMedicalRecordPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const appointmentId = searchParams.get('appointmentId') ?? ''
    const toast = useToast()

    const [form, setForm] = useState({
        appointmentId,
        chiefComplaint: '',
        symptoms: '',
        diagnosis: '',
        notes: '',
    })
    const [medications, setMedications] = useState([{ ...EMPTY_MED }])
    const [labTests, setLabTests] = useState([])
    const [vitals, setVitals] = useState({ bp: '', temp: '', hr: '', weight: '', height: '' })
    const [loading, setLoading] = useState(false)

    const setField = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

    const addMed = () => setMedications(p => [...p, { ...EMPTY_MED }])
    const removeMed = (i) => setMedications(p => p.filter((_, idx) => idx !== i))
    const setMed = (i, key) => (e) => setMedications(p => p.map((m, idx) => idx === i ? { ...m, [key]: e.target.value } : m))

    const addLab = () => setLabTests(p => [...p, { ...EMPTY_LAB }])
    const removeLab = (i) => setLabTests(p => p.filter((_, idx) => idx !== i))
    const setLab = (i, key) => (e) => setLabTests(p => p.map((l, idx) => idx === i ? { ...l, [key]: e.target.value } : l))

    const setVital = (key) => (e) => setVitals(p => ({ ...p, [key]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.chiefComplaint.trim()) return toast.error('Chief complaint is required')
        if (!form.appointmentId) return toast.error('Appointment ID is required')

        setLoading(true)
        try {
            await api.post('/api/medical-records', {
                ...form,
                symptoms: form.symptoms ? form.symptoms.split(',').map(s => s.trim()) : [],
                medications: medications.filter(m => m.name),
                labTests: labTests.filter(l => l.name),
                vitals,
            })
            toast.success('Medical record created')
            router.push('/doctor/appointments')
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to create record')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="text-h1 text-text-primary">New Medical Record</h1>
                <p className="text-body text-text-secondary">Document the consultation for this appointment</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic info */}
                <Card>
                    <CardHeader><CardTitle>Consultation Details</CardTitle></CardHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-caption text-text-secondary mb-1">Appointment ID *</label>
                            <Input value={form.appointmentId} onChange={setField('appointmentId')} placeholder="Appointment ID" required />
                        </div>
                        <div>
                            <label className="block text-caption text-text-secondary mb-1">Chief Complaint *</label>
                            <textarea
                                value={form.chiefComplaint} onChange={setField('chiefComplaint')} rows={2} required
                                placeholder="Patient's main complaint..."
                                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-body text-text-primary resize-none focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-caption text-text-secondary mb-1">Symptoms <span className="text-text-secondary">(comma-separated)</span></label>
                            <Input value={form.symptoms} onChange={setField('symptoms')} placeholder="e.g. fever, cough, fatigue" />
                        </div>
                        <div>
                            <label className="block text-caption text-text-secondary mb-1">Diagnosis</label>
                            <Input value={form.diagnosis} onChange={setField('diagnosis')} placeholder="Primary diagnosis" />
                        </div>
                        <div>
                            <label className="block text-caption text-text-secondary mb-1">Notes / Follow-up</label>
                            <textarea
                                value={form.notes} onChange={setField('notes')} rows={3}
                                placeholder="Additional notes, follow-up instructions..."
                                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-body text-text-primary resize-none focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                            />
                        </div>
                    </div>
                </Card>

                {/* Vitals */}
                <Card>
                    <CardHeader><CardTitle>Vitals</CardTitle></CardHeader>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {[['bp', 'Blood Pressure'], ['temp', 'Temperature (°C)'], ['hr', 'Heart Rate (bpm)'], ['weight', 'Weight (kg)'], ['height', 'Height (cm)']].map(([key, label]) => (
                            <div key={key}>
                                <label className="block text-caption text-text-secondary mb-1">{label}</label>
                                <Input value={vitals[key]} onChange={setVital(key)} placeholder={label} />
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Medications */}
                <Card>
                    <CardHeader>
                        <CardTitle>Medications</CardTitle>
                        <Button type="button" variant="secondary" size="sm" onClick={addMed}>+ Add</Button>
                    </CardHeader>
                    <div className="space-y-3">
                        {medications.map((m, i) => (
                            <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg bg-bg border border-border">
                                <Input value={m.name} onChange={setMed(i, 'name')} placeholder="Medicine name" />
                                <Input value={m.dosage} onChange={setMed(i, 'dosage')} placeholder="Dosage" />
                                <Input value={m.frequency} onChange={setMed(i, 'frequency')} placeholder="Frequency" />
                                <div className="flex gap-2">
                                    <Input value={m.duration} onChange={setMed(i, 'duration')} placeholder="Duration" className="flex-1" />
                                    {medications.length > 1 && (
                                        <button type="button" onClick={() => removeMed(i)}
                                            className="text-error hover:text-error/80 px-2">✕</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Lab tests */}
                <Card>
                    <CardHeader>
                        <CardTitle>Lab Tests / Investigations</CardTitle>
                        <Button type="button" variant="secondary" size="sm" onClick={addLab}>+ Add</Button>
                    </CardHeader>
                    <div className="space-y-2">
                        {labTests.map((l, i) => (
                            <div key={i} className="flex gap-2 p-2 rounded-lg bg-bg border border-border">
                                <Input value={l.name} onChange={setLab(i, 'name')} placeholder="Test name" className="flex-1" />
                                <Input value={l.notes} onChange={setLab(i, 'notes')} placeholder="Notes" className="flex-1" />
                                <button type="button" onClick={() => removeLab(i)}
                                    className="text-error hover:text-error/80 px-2">✕</button>
                            </div>
                        ))}
                        {labTests.length === 0 && (
                            <p className="text-caption text-text-secondary">No lab tests added</p>
                        )}
                    </div>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" loading={loading}>Save Record</Button>
                </div>
            </form>
        </div>
    )
}
