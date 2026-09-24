import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { SocketProvider } from '@/contexts/SocketContext'
import { ToastProvider } from '@/contexts/ToastContext'
import ToastContainer from '@/components/ui/Toast'

export const metadata = {
    title: 'Qline - OPD Queue Management',
    description: 'Digital OPD queue and appointment system for hospitals and clinics.',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <ToastProvider>
                    <AuthProvider>
                        <SocketProvider>
                            {children}
                            <ToastContainer />
                        </SocketProvider>
                    </AuthProvider>
                </ToastProvider>
            </body>
        </html>
    )
}
