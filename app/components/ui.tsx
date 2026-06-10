// 공용 UI 프리미티브 (Button / Card / Badge)
// 색상을 한 곳에 모아 Phase 5 다크모드 시 여기에만 dark: 변형을 추가하면 되도록 한다.
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

/* ───────── Button ───────── */
type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'danger' | 'success' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
  dark: 'bg-slate-800 text-white hover:bg-slate-900 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  success: 'bg-green-600 text-white hover:bg-green-700 shadow-sm',
  ghost: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
}
const BTN_SIZE: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'p-4 text-base rounded-xl',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${className}`}
      {...props}
    />
  )
}

/* ───────── Card ───────── */
export function Card({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`} {...props}>
      {children}
    </div>
  )
}

/* ───────── Badge ───────── */
type BadgeTone = 'green' | 'red' | 'yellow' | 'slate' | 'blue' | 'amber'

const BADGE_TONE: Record<BadgeTone, string> = {
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-800',
  slate: 'bg-slate-100 text-slate-600',
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-800',
}

export function Badge({
  tone = 'slate',
  className = '',
  children,
}: {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}) {
  return (
    <span className={`inline-block px-2 py-1 text-xs font-bold rounded ${BADGE_TONE[tone]} ${className}`}>
      {children}
    </span>
  )
}

// 신고/문제/회원 상태 → Badge 톤 매핑 헬퍼
export function statusTone(status: string): BadgeTone {
  switch (status) {
    case 'resolved':
    case 'approved':
    case 'active':
      return 'green'
    case 'dismissed':
    case 'suspended':
    case 'rejected':
      return 'slate'
    case 'pending':
      return 'yellow'
    default:
      return 'slate'
  }
}
