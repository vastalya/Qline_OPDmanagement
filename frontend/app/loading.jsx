import Spinner from '@/components/ui/Spinner'

export default function LoadingPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-bg">
            <Spinner size="lg" className="text-primary" />
        </div>
    )
}
