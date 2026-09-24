'use client'

import { cn } from '@/lib/utils'

export default function Pagination({ page, pages, onPageChange, loading = false }) {
    if (pages <= 1) return null

    const prev = page - 1
    const next = page + 1

    const pageNumbers = Array.from({ length: pages }, (_, i) => i + 1)
    // Show at most 5 page numbers around current.
    const visible = pageNumbers.filter(
        (p) => p === 1 || p === pages || Math.abs(p - page) <= 2
    )

    return (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-1">
            <PageBtn
                disabled={page <= 1 || loading}
                onClick={() => onPageChange(prev)}
                aria-label="Previous page"
            >
                {'<'}
            </PageBtn>

            {visible.map((p, i) => {
                const previousVisible = visible[i - 1]
                return (
                    <div key={`page-${p}`} className="flex items-center">
                        {previousVisible && p - previousVisible > 1 && (
                            <span className="px-2 text-body text-text-secondary">...</span>
                        )}
                        <PageBtn
                            active={p === page}
                            disabled={loading}
                            onClick={() => p !== page && onPageChange(p)}
                        >
                            {p}
                        </PageBtn>
                    </div>
                )
            })}

            <PageBtn
                disabled={page >= pages || loading}
                onClick={() => onPageChange(next)}
                aria-label="Next page"
            >
                {'>'}
            </PageBtn>
        </nav>
    )
}

function PageBtn({ children, active, disabled, onClick, ...props }) {
    return (
        <button
            disabled={disabled}
            onClick={onClick}
            className={cn(
                'flex h-9 w-9 items-center justify-center rounded-sm text-body font-medium transition-colors duration-200',
                active
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:bg-primary-soft hover:text-primary',
                disabled && 'cursor-not-allowed opacity-40'
            )}
            {...props}
        >
            {children}
        </button>
    )
}

