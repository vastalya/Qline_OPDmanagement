import { format, formatDistanceToNow } from 'date-fns'

export const formatDate = (date) =>
    date ? format(new Date(date), 'MMM d, yyyy') : ''

export const formatTime = (date) =>
    date ? format(new Date(date), 'h:mm a') : ''

export const formatDateTime = (date) =>
    date ? format(new Date(date), 'MMM d, yyyy - h:mm a') : ''

export const timeAgo = (date) =>
    date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : ''

export const getInitials = (name = '') =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

/** Safely prefix "Dr." exactly once */
export const drName = (name) => {
    if (!name) return 'Doctor'
    const n = name.trim()
    return n.toLowerCase().startsWith('dr.') ? n : `Dr. ${n}`
}

export const cn = (...classes) => classes.filter(Boolean).join(' ')

export const STATUS_CONFIG = {
    booked: { label: 'Booked', bg: 'bg-info/10', text: 'text-info' },
    waiting: { label: 'Waiting', bg: 'bg-info/10', text: 'text-info' },
    in_progress: { label: 'In Progress', bg: 'bg-warning/10', text: 'text-warning' },
    in_consultation: { label: 'In Consultation', bg: 'bg-warning/10', text: 'text-warning' },
    completed: { label: 'Completed', bg: 'bg-success/10', text: 'text-success' },
    cancelled: { label: 'Cancelled', bg: 'bg-error/10', text: 'text-error' },
    no_show: { label: 'No Show', bg: 'bg-error/10', text: 'text-error' },
    emergency: { label: 'Emergency', bg: 'bg-error/10', text: 'text-error' },
    senior: { label: 'Senior', bg: 'bg-warning/10', text: 'text-warning' },
    standard: { label: 'Standard', bg: 'bg-info/10', text: 'text-info' },
    active: { label: 'Active', bg: 'bg-success/10', text: 'text-success' },
    inactive: { label: 'Inactive', bg: 'bg-error/10', text: 'text-error' },
    paused: { label: 'Paused', bg: 'bg-warning/10', text: 'text-warning' },
}

export const getStatusConfig = (status) =>
    STATUS_CONFIG[status] || { label: status, bg: 'bg-border', text: 'text-text-secondary' }

export const PAGE_SIZE = 10

export const DEPARTMENTS = [
    'Cardiology', 'Dermatology', 'ENT', 'General Medicine',
    'Neurology', 'Ophthalmology', 'Orthopedics', 'Pediatrics',
    'Psychiatry', 'Radiology',
]

export const ROLE_DASHBOARDS = {
    patient: '/patient/dashboard',
    doctor: '/doctor/dashboard',
    admin: '/admin/dashboard',
}
