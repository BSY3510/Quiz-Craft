'use client'

// 페이지 번호 목록 계산 (생략 … 포함). 총 7페이지 이하는 전부 표시.
function pageItems(page: number, total: number): (number | 'dots')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const items: (number | 'dots')[] = [1]
  if (page > 3) items.push('dots')

  const start = Math.max(2, page - 1)
  const end = Math.min(total - 1, page + 1)
  for (let i = start; i <= end; i++) items.push(i)

  if (page < total - 2) items.push('dots')
  items.push(total)
  return items
}

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const items = pageItems(page, totalPages)
  const btn =
    'min-w-9 h-9 px-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center'

  return (
    <nav className="flex justify-center items-center gap-1.5 mt-6" aria-label="페이지 이동">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="이전 페이지"
        className={`${btn} bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        ‹
      </button>

      {items.map((item, i) =>
        item === 'dots' ? (
          <span key={`dots-${i}`} className="px-1 text-slate-400 select-none">…</span>
        ) : (
          <button
            key={item}
            onClick={() => onChange(item)}
            aria-current={page === item ? 'page' : undefined}
            className={`${btn} ${
              page === item
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        aria-label="다음 페이지"
        className={`${btn} bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        ›
      </button>
    </nav>
  )
}
