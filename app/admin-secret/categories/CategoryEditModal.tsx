'use client'

import { Modal } from '@/app/components/Modal'
import type { Category, CategoryGroup } from '@/types/db'

// 분야 아이콘 빠른 선택용 프리셋(프로그래밍/학습 분야 위주). 직접 입력도 가능.
const PRESET_ICONS = ['💡', '🟦', '🟨', '🐍', '☕', '🗄️', '🌐', '⚛️', '📱', '🔧', '🧮', '📊', '🔐', '🐳', '🦀', '🐘', '📦', '🧪', '🖥️', '⚙️', '📚', '🧩', '🚀', '🔥']

// 분야 정보 수정 모달. 상태(편집 중 분야)는 부모가 보유하고, 변경은 onChange 로 위임한다.
export default function CategoryEditModal({
  category,
  groups,
  onChange,
  onClose,
  onSave,
}: {
  category: Category | null
  groups: CategoryGroup[]
  onChange: (c: Category) => void
  onClose: () => void
  onSave: () => void
}) {
  return (
    <Modal open={!!category} onClose={onClose} className="max-w-sm" labelledBy="cat-edit-title">
      {category && (
        <div className="space-y-4">
          <h2 id="cat-edit-title" className="text-lg font-black text-slate-800 dark:text-slate-100">📚 분야 정보 수정</h2>
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">분야 ID (변경 불가)</label>
            <input type="text" value={category.id} disabled className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-mono text-sm text-slate-400 uppercase dark:bg-slate-900 dark:border-slate-700 dark:text-slate-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">표시 이름 <span className="font-normal text-slate-400 dark:text-slate-500">(사용자 화면에 보이는 짧은 이름)</span></label>
            <input
              type="text"
              value={category.name}
              onChange={(e) => onChange({ ...category, name: e.target.value })}
              placeholder="예: 홍길동"
              className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">부제(설명) <span className="font-normal text-slate-400 dark:text-slate-500">(선택 · 카드 부제로 표시)</span></label>
            <input
              type="text"
              value={category.description || ''}
              onChange={(e) => onChange({ ...category, description: e.target.value })}
              placeholder="예: 1990년대 발라드 가수"
              className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">AI용 이름 <span className="font-normal text-slate-400 dark:text-slate-500">(선택 · 화면에 안 보임 · 비우면 표시 이름 사용)</span></label>
            <input
              type="text"
              value={category.ai_name || ''}
              onChange={(e) => onChange({ ...category, ai_name: e.target.value })}
              placeholder="예: 홍길동(1990년대 발라드 가수) — 동명이인 구분용"
              className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">출제 프롬프트의 <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded font-mono">{'{{category}}'}</code> 치환에 사용됩니다. 동명이인·중의어 분야의 정확도를 위해 사용.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">상위 그룹 <span className="font-normal text-slate-400 dark:text-slate-500">(선택 · 비우면 미분류)</span></label>
            <select
              value={category.group_id || ''}
              onChange={(e) => onChange({ ...category, group_id: e.target.value || null })}
              className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100"
            >
              <option value="">미분류</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">분야 아이콘 <span className="font-normal text-slate-400 dark:text-slate-500">(선택 · 비우면 기본 💡)</span></label>
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 shrink-0 flex items-center justify-center text-2xl bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                {category.icon || '💡'}
              </div>
              <input
                type="text"
                value={category.icon || ''}
                onChange={(e) => onChange({ ...category, icon: e.target.value })}
                placeholder="이모지 직접 입력"
                className="flex-1 p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => onChange({ ...category, icon: '' })}
                className="shrink-0 px-3 py-2.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                기본값
              </button>
            </div>
            <div className="grid grid-cols-8 gap-1.5 mt-2">
              {PRESET_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onChange({ ...category, icon: emoji })}
                  className={`aspect-square flex items-center justify-center text-lg rounded-lg border transition-colors ${
                    category.icon === emoji
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">분야별 출제 가이드 <span className="font-normal text-slate-400 dark:text-slate-500">(선택)</span></label>
            <textarea
              value={category.prompt || ''}
              onChange={(e) => onChange({ ...category, prompt: e.target.value })}
              rows={4}
              placeholder={'이 분야에 특화된 출제 지시를 적어주세요.\n예: 최신 LTS 기준, 컬렉션·제네릭·스트림 위주. 너무 지엽적인 문법은 제외.'}
              className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">마스터 프롬프트의 <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded font-mono">{'{{category_guide}}'}</code> 자리에 삽입됩니다. 비워두면 마스터만 사용.</p>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onSave} className="flex-1 p-3 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700">변경 저장</button>
            <button onClick={onClose} className="flex-1 p-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">취소</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
