export default function AuthLayout({ children }) {
    return (
        <div className="relative min-h-screen overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-70">
                <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-info/10 blur-3xl" />
            </div>

            <div className="relative mx-auto grid min-h-screen w-full max-w-[1100px] items-center gap-10 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
                <section className="hidden lg:block">
                    <div className="space-y-8">
                        <div className="space-y-3">
                            <p className="inline-flex rounded-pill bg-primary-soft px-3 py-1 text-caption font-medium text-primary">
                                Smart OPD Operations
                            </p>
                            <h1 className="max-w-lg text-4xl font-semibold leading-tight text-text-primary">
                                Faster patient flow, clearer doctor schedules, zero queue confusion.
                            </h1>
                            <p className="max-w-md text-body-lg text-text-secondary">
                                Qline helps hospitals coordinate appointments and live queues in one reliable workflow.
                            </p>
                        </div>

                        <div className="grid max-w-md grid-cols-3 gap-3">
                            <div className="glass-surface rounded-lg p-3">
                                <p className="text-h3 text-primary">24/7</p>
                                <p className="text-caption text-text-secondary">Tracking</p>
                            </div>
                            <div className="glass-surface rounded-lg p-3">
                                <p className="text-h3 text-primary">Live</p>
                                <p className="text-caption text-text-secondary">Queue feed</p>
                            </div>
                            <div className="glass-surface rounded-lg p-3">
                                <p className="text-h3 text-primary">Secure</p>
                                <p className="text-caption text-text-secondary">Sessions</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="flex items-center justify-center">
                    <div className="w-full max-w-md">{children}</div>
                </section>
            </div>
        </div>
    )
}
