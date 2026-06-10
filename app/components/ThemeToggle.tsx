'use client'

import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

function applyTheme(theme: Theme) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)
}

const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: '라이트', icon: '☀️' },
  { value: 'dark', label: '다크', icon: '🌙' },
  { value: 'system', label: '시스템', icon: '💻' },
]

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system')

  // 초기값 로드(서버/클라 불일치 방지를 위해 마운트 후 읽음)
  useEffect(() => {
    const stored = (localStorage.getItem('theme') as Theme | null) ?? 'system'
    setTheme(stored)
  }, [])

  // 'system'일 때 OS 테마 변경에 실시간 반응
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const choose = (t: Theme) => {
    setTheme(t)
    localStorage.setItem('theme', t)
    applyTheme(t)
  }

  return (
    <div className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-700 p-1" role="group" aria-label="화면 테마">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => choose(opt.value)}
          aria-pressed={theme === opt.value}
          className={`flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
            theme === opt.value
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {opt.icon} {opt.label}
        </button>
      ))}
    </div>
  )
}
