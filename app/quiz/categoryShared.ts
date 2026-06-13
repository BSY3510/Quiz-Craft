// /quiz 분야 목록 공용 타입·헬퍼 (CategoryList / 피커 모달 공유 — 리팩토링 10-1)

export interface CategoryItem {
  id: string
  name: string
  icon: string | null
  description: string | null
  group_id: string | null
}
export interface GroupItem {
  id: string
  name: string
  icon: string | null
  sort_order: number
}
export type Section = { key: string; label: string; icon: string | null; items: CategoryItem[] }

const FALLBACK_ICONS: Record<string, string> = { java: '☕', spring: '🍃', python: '🐍', react: '⚛️' }
export function iconFor(c: CategoryItem) {
  return c.icon || FALLBACK_ICONS[c.id] || '💡'
}

// 상위 그룹 정렬(sort_order → 이름순).
export function sortGroups(groups: GroupItem[]): GroupItem[] {
  return [...groups].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ko'))
}

// 분야 목록을 그룹 섹션으로 묶는다(미분류는 마지막 '기타', 빈 섹션 제외). 그룹 없으면 라벨 없는 단일 섹션.
export function groupIntoSections(items: CategoryItem[], groups: GroupItem[]): Section[] {
  if (groups.length === 0) return [{ key: '__all__', label: '', icon: null, items }]
  const groupIds = new Set(groups.map((g) => g.id))
  return [
    ...sortGroups(groups).map((g) => ({ key: g.id, label: g.name, icon: g.icon, items: items.filter((c) => c.group_id === g.id) })),
    { key: '__none__', label: '기타', icon: '📦', items: items.filter((c) => !c.group_id || !groupIds.has(c.group_id)) },
  ].filter((s) => s.items.length > 0)
}

// 분야 id·이름뿐 아니라 소속 카테고리(그룹)명으로도 검색되게 한다.
export function matchCategory(c: CategoryItem, kw: string, groups: GroupItem[]): boolean {
  if (!kw) return true
  const groupName = c.group_id ? (groups.find((g) => g.id === c.group_id)?.name ?? '') : ''
  return (
    c.id.toLowerCase().includes(kw) ||
    c.name.toLowerCase().includes(kw) ||
    groupName.toLowerCase().includes(kw)
  )
}
