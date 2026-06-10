'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Modal } from './Modal'

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

interface ConfirmState extends ConfirmOptions {
  open: boolean
  resolve: (result: boolean) => void
}

// confirm()을 대체하는 약속 기반 확인창. `const ok = await confirm({ message })`.
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, resolve, ...opts })
    })
  }, [])

  const close = (result: boolean) => {
    state?.resolve(result)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={!!state?.open} onClose={() => close(false)} className="max-w-sm" labelledBy="confirm-title">
        <h2 id="confirm-title" className="text-lg font-black text-slate-800 mb-2">
          {state?.title ?? '확인'}
        </h2>
        <p className="text-sm text-slate-600 whitespace-pre-line mb-6">{state?.message}</p>
        <div className="flex gap-2">
          <button
            onClick={() => close(false)}
            className="flex-1 p-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 transition-colors"
          >
            {state?.cancelText ?? '취소'}
          </button>
          <button
            onClick={() => close(true)}
            className={`flex-1 p-3 text-white font-bold rounded-xl text-sm transition-colors ${
              state?.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {state?.confirmText ?? '확인'}
          </button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}
