'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem { id: number; message: string; type: ToastType }

interface ToastApi {
  show: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

let counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++counter
    setToasts((list) => [...list, { id, message, type }])
    setTimeout(() => remove(id), 3500)
  }, [remove])

  const api: ToastApi = {
    show,
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
    info: (m) => show(m, 'info'),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* aria-live 영역: 스크린리더가 토스트 메시지를 읽음 */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            onClick={() => remove(t.id)}
            className={`pointer-events-auto w-full max-w-sm cursor-pointer rounded-xl border px-4 py-3 text-sm font-bold shadow-lg transition-all animate-[fadeIn_0.15s_ease-out] ${
              t.type === 'success'
                ? 'bg-green-600 text-white border-green-700'
                : t.type === 'error'
                ? 'bg-red-600 text-white border-red-700'
                : 'bg-slate-800 text-white border-slate-900'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
