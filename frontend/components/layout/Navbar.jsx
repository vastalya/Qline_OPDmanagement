'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { cn, getInitials } from '@/lib/utils'
import Button from '@/components/ui/Button'

const NAV_LINKS = {
    patient: [
        { href: '/patient/dashboard', label: 'Dashboard' },
        { href: '/doctors', label: 'Find Doctor' },
        { href: '/appointments', label: 'My Appointments' },
        { href: '/medical-records', label: 'Medical Records' },
        { href: '/notifications', label: 'Notifications' },
        { href: '/profile', label: 'Profile' },
    ],
    doctor: [
        { href: '/doctor/dashboard', label: 'Dashboard' },
        { href: '/doctor/appointments', label: 'Appointments' },
        { href: '/doctor/schedule', label: 'Schedule' },
        { href: '/doctor/patients', label: 'Patients' },
        { href: '/doctor/medical-records', label: 'Records' },
        { href: '/doctor/analytics', label: 'Analytics' },
        { href: '/doctor/notifications', label: 'Notifications' },
    ],
    admin: [
        { href: '/admin/dashboard', label: 'Dashboard' },
        { href: '/admin/doctors', label: 'Doctors' },
        { href: '/admin/users', label: 'Users' },
        { href: '/admin/queues/live', label: 'Live Queues' },
        { href: '/admin/analytics', label: 'Analytics' },
        { href: '/admin/audit-logs', label: 'Audit Logs' },
        { href: '/admin/settings/general', label: 'Settings' },
    ],
}

export default function Navbar() {
    const { user, logout } = useAuth()
    const pathname = usePathname()
    const links = NAV_LINKS[user?.role] || []

    return (
        <header className="sticky top-0 z-40 border-b border-border/80 bg-surface/90 backdrop-blur-sm shadow-1">
            <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-4">
                <Link href="/" className="text-h3 font-semibold tracking-tight text-primary">
                    Qline
                </Link>

                <nav className="hidden md:flex items-center gap-1">
                    {links.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                'rounded-lg px-3 py-2 text-body font-medium transition-colors duration-200',
                                pathname.startsWith(href)
                                    ? 'bg-primary-soft text-primary'
                                    : 'text-text-secondary hover:bg-primary-soft hover:text-text-primary'
                            )}
                        >
                            {label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-caption font-semibold text-primary">
                            {getInitials(user?.name)}
                        </span>
                        <span className="hidden text-body font-medium text-text-primary lg:block">
                            {user?.name}
                        </span>
                    </div>
                    <Button variant="secondary" size="sm" onClick={logout}>
                        Sign out
                    </Button>
                </div>
            </div>

            <nav className="md:hidden border-t border-border/70 bg-surface/90 px-2 py-2">
                <div className="no-scrollbar flex gap-1 overflow-x-auto">
                    {links.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                'whitespace-nowrap rounded-lg px-3 py-1.5 text-caption font-medium transition-colors',
                                pathname.startsWith(href)
                                    ? 'bg-primary-soft text-primary'
                                    : 'text-text-secondary hover:bg-primary-soft hover:text-text-primary'
                            )}
                        >
                            {label}
                        </Link>
                    ))}
                </div>
            </nav>
        </header>
    )
}
