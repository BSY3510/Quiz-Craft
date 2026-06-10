'use client'

import { usePathname } from 'next/navigation'

// 현재 경로에서 관리자 메인 경로(/admin-xxxx)를 추출. 여러 관리자 페이지 공용.
export function useAdminPath() {
  const pathname = usePathname()
  return pathname.split('/').slice(0, 2).join('/')
}
