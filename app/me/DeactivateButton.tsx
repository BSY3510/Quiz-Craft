'use client'

import { deactivateAccount } from './actions'

export default function DeactivateButton() {
  
  // ✅ 서버 액션을 한 번 감싸서(Wrap) 호출하는 함수
  const handleDeactivate = async () => {
    if (confirm('정말 탈퇴하시겠습니까? 모든 학습 기록은 비활성화됩니다.')) {
      await deactivateAccount() // 반환값이 있어도 여기서 무시되므로 타입 에러가 발생하지 않음
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