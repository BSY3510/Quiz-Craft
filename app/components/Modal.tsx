'use client'

import { useEffect, useRef, type ReactNode } from 'react'

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** 내부 박스 폭 클래스 (예: max-w-sm / max-w-md / max-w-2xl) */
  className?: string
  /** 제목 요소 id (aria-labelledby) */
  labelledBy?: string
}

// 접근성 모달: role=dialog, ESC·오버레이 클릭 닫기, 포커스 트랩, 배경 스크롤 락.
export function Modal({ open, onClose, children, className = 'max-w-md', labelledBy }: ModalProps) {
  const boxRef = useRef<HTMLDivElement>(null)

  // 최신 onClose를 ref로 보관 — 아래 열림 effect가 onClose 변경 때마다 재실행되어
  // (인라인 함수 prop의 경우) 입력 중 포커스를 빼앗는 문제를 막는다.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    // 배경 스크롤 락
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // 직전 포커스 저장(닫을 때 복원)
    const prevActive = document.activeElement as HTMLElement | null

    // 모달 안으로 포커스 이동 (열릴 때 1회)
    boxRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key === 'Tab' && boxRef.current) {
        const nodes = boxRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
        if (nodes.length === 0) return
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
      prevActive?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-slate-800 rounded-2xl p-6 w-full ${className} max-h-[90vh] overflow-y-auto shadow-2xl outline-none`}
      >
        {children}
      </div>
    </div>
  )
}
