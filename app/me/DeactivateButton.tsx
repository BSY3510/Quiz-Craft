'use client'

import { deactivateAccount } from './actions'
import { useConfirm } from '@/app/components/Confirm'

export default function DeactivateButton() {
  const confirm = useConfirm()

  const handleDeactivate = async () => {
    const ok = await confirm({
      title: '회원 탈퇴',
      message: '정말 탈퇴하시겠습니까?\n모든 학습 기록이 비활성화됩니다.',
      confirmText: '탈퇴',
      danger: true,
    })
    if (ok) {
      await deactivateAccount()
    }
  }

  return (
    <button
      onClick={handleDeactivate}
      className="w-full p-3 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 transition-colors"
    >
      계정 비활성화 (회원 탈퇴)
    </button>
  )
}
