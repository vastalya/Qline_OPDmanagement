'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { DEPARTMENTS, cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DEFAULT_FORM = {
    department: '',
    workingHoursStart: '09:00',
    workingHoursEnd: '17:00',
    defaultConsultTime: 15,
    maxPatientsPerDay: 30,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    breakSlots: [],
}

const EMPTY_BREAK = { start: '', end: '', reason: '' }

export default function DoctorConfigurePage() {
    const toast = useToast()
    const [form, setForm] = useState(DEFAULT_FORM)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        api.get('/api/doctors/my-schedule')
            .then((response) => {
                const doctor = response.data?.doctor ?? response.data?.data?.doctor ?? response.data?.data ?? response.data
                if (!doctor) return

                setForm({
                    department: doctor.department ?? '',
                    workingHoursStart: doctor.workingHours?.start ?? DEFAULT_FORM.workingHoursStart,
                    workingHoursEnd: doctor.workingHours?.end ?? DEFAULT_FORM.workingHoursEnd,
                    defaultConsultTime: doctor.defaultConsultTime ?? DEFAULT_FORM.defaultConsultTime,
                    maxPatientsPerDay: doctor.maxPatientsPerDay ?? DEFAULT_FORM.maxPatientsPerDay,
                    workingDays: doctor.workingDays?.length ? doctor.workingDays : DEFAULT_FORM.workingDays,
                    breakSlots: doctor.breakSlots?.length ? doctor.breakSlots : [],
                })
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [])

    const setField = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))
    const setNumberField = (key) => (event) => setForm((prev) => ({ ...prev, [key]: Number(event.target.value) }))

    const toggleWorkingDay = (day) => {
        setForm((prev) => {
            const exists = prev.workingDays.includes(day)
            return {
                ...prev,
                workingDays: exists
                    ? prev.workingDays.filter((value) => value !== day)
                    : [...prev.workingDays, day],
            }
        })
    }

    const addBreakSlot = () => {
        setForm((prev) => ({
            ...prev,
            breakSlots: [...prev.breakSlots, { ...EMPTY_BREAK }],
        }))
    }

    const updateBreakSlot = (index, key, value) => {
        setForm((prev) => ({
            ...prev,
            breakSlots: prev.breakSlots.map((slot, slotIndex) => (
                slotIndex === index ? { ...slot, [key]: value } : slot
            )),
        }))
    }

    const removeBreakSlot = (index) => {
        setForm((prev) => ({
            ...prev,
            breakSlots: prev.breakSlots.filter((_, slotIndex) => slotIndex !== index),
        }))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        if (!form.department) {
            toast.error('Please select a department')
            return
        }

        if (form.workingDays.length === 0) {
            toast.error('Select at least one working day')
            return
        }

        if (form.workingHoursStart >= form.workingHoursEnd) {
            toast.error('End time must be after start time')
            return
        }

        const sanitizedBreakSlots = form.breakSlots
            .filter((slot) => slot.start && slot.end)
            .map((slot) => ({
                start: slot.start,
                end: slot.end,
                reason: slot.reason?.trim() || '',
            }))

        if (sanitizedBreakSlots.some((slot) => slot.start >= slot.end)) {
            toast.error('Each break must end after it starts')
            return
        }

        setSaving(true)
        try {
            await api.post('/api/doctors/configure', {
                department: form.department,
                workingHours: {
                    start: form.workingHoursStart,
                    end: form.workingHoursEnd,
                },
                workingDays: form.workingDays,
                breakSlots: sanitizedBreakSlots,
                defaultConsultTime: Number(form.defaultConsultTime),
                maxPatientsPerDay: Number(form.maxPatientsPerDay),
            })
            toast.success('Schedule saved. Patients can now see real appointment slots.')
        } catch (error) {
            toast.error(error?.response?.data?.message || error?.response?.data?.errors?.[0] || 'Save failed')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <Spinner size="lg" className="text-primary" />
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div>
                <h1 className="text-h1 text-text-primary">Configure Schedule</h1>
                <p className="mt-1 text-body text-text-secondary">
                    Set working days, hours, breaks, and consultation capacity for appointment booking.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Department</CardTitle>
                    </CardHeader>
                    <select
                        value={form.department}
                        onChange={setField('department')}
                        required
                        className="h-11 w-full rounded-lg border border-border bg-surface px-4 text-body text-text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                    >
                        <option value="">Select department</option>
                        {DEPARTMENTS.map((department) => (
                            <option key={department} value={department}>{department}</option>
                        ))}
                    </select>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Working Days</CardTitle>
                    </CardHeader>
                    <div className="flex flex-wrap gap-2">
                        {DAYS.map((day) => {
                            const active = form.workingDays.includes(day)
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleWorkingDay(day)}
                                    className={cn(
                                        'rounded-full border px-4 py-2 text-body transition-colors',
                                        active
                                            ? 'border-primary bg-primary-soft text-primary'
                                            : 'border-border bg-surface text-text-secondary hover:border-primary'
                                    )}
                                >
                                    {day}
                                </button>
                            )
                        })}
                    </div>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Working Hours</CardTitle>
                    </CardHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-caption text-text-secondary">Start time</label>
                            <input
                                type="time"
                                value={form.workingHoursStart}
                                onChange={setField('workingHoursStart')}
                                required
                                className="h-11 w-full rounded-lg border border-border bg-surface px-4 text-body text-text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-caption text-text-secondary">End time</label>
                            <input
                                type="time"
                                value={form.workingHoursEnd}
                                onChange={setField('workingHoursEnd')}
                                required
                                className="h-11 w-full rounded-lg border border-border bg-surface px-4 text-body text-text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                            />
                        </div>
                    </div>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Break Slots</CardTitle>
                    </CardHeader>
                    <div className="space-y-3">
                        {form.breakSlots.length === 0 && (
                            <p className="text-body text-text-secondary">No break slots added.</p>
                        )}

                        {form.breakSlots.map((slot, index) => (
                            <div key={`${slot.start}-${slot.end}-${index}`} className="grid gap-3 rounded-lg border border-border bg-bg p-4 md:grid-cols-[1fr_1fr_2fr_auto]">
                                <div>
                                    <label className="mb-1 block text-caption text-text-secondary">Start</label>
                                    <input
                                        type="time"
                                        value={slot.start}
                                        onChange={(event) => updateBreakSlot(index, 'start', event.target.value)}
                                        className="h-11 w-full rounded-lg border border-border bg-surface px-4 text-body text-text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-caption text-text-secondary">End</label>
                                    <input
                                        type="time"
                                        value={slot.end}
                                        onChange={(event) => updateBreakSlot(index, 'end', event.target.value)}
                                        className="h-11 w-full rounded-lg border border-border bg-surface px-4 text-body text-text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                                    />
                                </div>
                                <Input
                                    label="Reason"
                                    value={slot.reason ?? ''}
                                    onChange={(event) => updateBreakSlot(index, 'reason', event.target.value)}
                                    placeholder="Lunch, ward round, admin work"
                                />
                                <div className="flex items-end">
                                    <Button type="button" variant="ghost" onClick={() => removeBreakSlot(index)} className="w-full">
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        ))}

                        <Button type="button" variant="secondary" onClick={addBreakSlot}>
                            Add Break Slot
                        </Button>
                    </div>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Capacity</CardTitle>
                    </CardHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Consultation time (min)"
                            type="number"
                            min={5}
                            max={120}
                            value={form.defaultConsultTime}
                            onChange={setNumberField('defaultConsultTime')}
                            hint="5 to 120 minutes per patient"
                            required
                        />
                        <Input
                            label="Max patients per day"
                            type="number"
                            min={1}
                            max={200}
                            value={form.maxPatientsPerDay}
                            onChange={setNumberField('maxPatientsPerDay')}
                            hint="Booking closes after this daily limit"
                            required
                        />
                    </div>
                </Card>

                <Button type="submit" fullWidth loading={saving}>
                    Save Schedule
                </Button>
            </form>
        </div>
    )
}
