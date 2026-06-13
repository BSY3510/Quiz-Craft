'use server'

import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/auth'
import { revalidatePath } from 'next/cache'
import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from '@google/generative-ai'
import { parseJsonLoose } from '../questionSchema'
import { DEFAULT_GEMINI_MODEL } from '@/app/lib/constants'

// 분야 생성
export async function createCategory(id: string, name: string) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const cleanId = id.toLowerCase().trim()
  const cleanName = name.trim()
  if (!cleanId || !cleanName) return { error: '식별 ID와 분야명을 입력해 주세요.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .insert({ id: cleanId, name: cleanName, active: true })

  if (error) return { error: '분야 추가 중 오류가 발생했습니다. (ID 중복 등)' }
  revalidatePath('/quiz')
  return { success: true }
}

// 분야 활성/비활성 토글
export async function toggleCategoryActive(id: string, currentActive: boolean) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .update({ active: !currentActive })
    .eq('id', id)

  if (error) return { error: '상태 변경 중 오류가 발생했습니다.' }
  revalidatePath('/quiz')
  return { success: true }
}

// 분야 정보 수정 (표시명 + 부제 + AI용 이름 + 출제 가이드 + 아이콘 + 상위 그룹)
export async function updateCategory(
  id: string,
  fields: {
    name: string
    prompt?: string | null
    icon?: string | null
    description?: string | null
    ai_name?: string | null
    group_id?: string | null
  }
) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const cleanName = fields.name.trim()
  if (!cleanName) return { error: '분야명을 입력해 주세요.' }

  // 아이콘은 이모지 1~2자 정도만 의도 — 과도한 입력은 잘라낸다(빈 값이면 null=폴백)
  const cleanIcon = (fields.icon ?? '').trim().slice(0, 8) || null

  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .update({
      name: cleanName,
      prompt: fields.prompt?.trim() || null,
      icon: cleanIcon,
      description: fields.description?.trim() || null,
      ai_name: fields.ai_name?.trim() || null,
      group_id: fields.group_id || null,
    })
    .eq('id', id)

  if (error) return { error: '수정 중 오류가 발생했습니다.' }
  revalidatePath('/quiz')
  return { success: true }
}

// ── 상위 카테고리(그룹) CRUD (7번) ──
export async function createGroup(name: string, icon?: string | null) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const cleanName = name.trim()
  if (!cleanName) return { error: '그룹명을 입력해 주세요.' }
  const cleanIcon = (icon ?? '').trim().slice(0, 8) || null

  const supabase = await createClient()
  const { error } = await supabase.from('category_groups').insert({ name: cleanName, icon: cleanIcon })
  if (error) return { error: '그룹 추가 중 오류가 발생했습니다.' }
  revalidatePath('/quiz')
  return { success: true }
}

export async function updateGroup(id: string, name: string, icon?: string | null, sortOrder?: number) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const cleanName = name.trim()
  if (!cleanName) return { error: '그룹명을 입력해 주세요.' }
  const cleanIcon = (icon ?? '').trim().slice(0, 8) || null

  const supabase = await createClient()
  const { error } = await supabase
    .from('category_groups')
    .update({ name: cleanName, icon: cleanIcon, sort_order: Math.floor(Number(sortOrder)) || 0 })
    .eq('id', id)
  if (error) return { error: '그룹 수정 중 오류가 발생했습니다.' }
  revalidatePath('/quiz')
  return { success: true }
}

// 그룹 삭제: categories.group_id 는 ON DELETE SET NULL(미분류로 강등). 분야는 보존된다.
export async function deleteGroup(id: string) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const supabase = await createClient()
  const { error } = await supabase.from('category_groups').delete().eq('id', id)
  if (error) return { error: '그룹 삭제 중 오류가 발생했습니다.' }
  revalidatePath('/quiz')
  return { success: true }
}

// ── 분야 → 상위 그룹 이동 (카테고리 관리 보드) ──
// 단건 이동. group_id 가 빈 값/null 이면 미분류로 강등.
export async function setCategoryGroup(id: string, groupId: string | null) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .update({ group_id: groupId || null })
    .eq('id', id)

  if (error) return { error: '분류 변경 중 오류가 발생했습니다.' }
  revalidatePath('/quiz')
  return { success: true }
}

// 여러 분야를 한 번에 같은 그룹으로 이동(체크박스 일괄 처리).
export async function setCategoriesGroup(ids: string[], groupId: string | null) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }
  if (!Array.isArray(ids) || ids.length === 0) return { error: '이동할 분야를 선택해 주세요.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .update({ group_id: groupId || null })
    .in('id', ids)

  if (error) return { error: '일괄 분류 변경 중 오류가 발생했습니다.' }
  revalidatePath('/quiz')
  return { success: true, count: ids.length }
}

// ── AI 자동 분류 ──
// 전체 분야 정보를 Gemini 에 보내 "기존 그룹 매핑 또는 새 그룹 제안"을 받는다.
// ⚠️ DB 에는 쓰지 않는다(미리보기용). 실제 반영은 관리자 승인 후 applyClassification 으로.
const CLASSIFY_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      category_id: { type: SchemaType.STRING },
      group_name: { type: SchemaType.STRING },
    },
    required: ['category_id', 'group_name'],
  },
}

export async function classifyCategoriesWithAI() {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const supabase = await createClient()
  const [{ data: cats }, { data: grps }, { data: settings }] = await Promise.all([
    supabase.from('categories').select('id, name, description, ai_name'),
    supabase.from('category_groups').select('name'),
    supabase.from('site_settings').select('gemini_model').eq('id', 1).single(),
  ])

  if (!cats || cats.length === 0) return { error: '분류할 분야가 없습니다.' }

  const existingGroups = (grps ?? []).map((g) => g.name).filter(Boolean)
  const catLines = cats
    .map((c2) => `- id: ${c2.id} / 이름: ${c2.name}${c2.description ? ` / 설명: ${c2.description}` : ''}${c2.ai_name ? ` / 정밀표현: ${c2.ai_name}` : ''}`)
    .join('\n')

  const prompt = `너는 학습 퀴즈 서비스의 분야를 상위 카테고리로 분류하는 사서다.
아래 "분야 목록"의 각 분야를 가장 적절한 상위 카테고리(그룹)로 분류하라.

규칙:
- 가능하면 "기존 카테고리"를 그대로 재사용하라.
- 기존 카테고리가 적절하지 않을 때만 새 카테고리명을 제안하라. 새 이름은 간결한 한국어 명사로(예: "프로그래밍", "자격증", "어학", "상식").
- 비슷한 분야는 같은 카테고리로 묶어 카테고리 수가 과도하게 늘지 않게 하라.
- 모든 분야에 대해 정확히 하나의 group_name 을 지정하라.

기존 카테고리: ${existingGroups.length ? existingGroups.join(', ') : '(없음)'}

분야 목록:
${catLines}

출력: 각 원소가 {category_id, group_name} 인 JSON 배열만.`

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const modelName = settings?.gemini_model || process.env.GEMINI_MODEL_VERSION || DEFAULT_GEMINI_MODEL
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: 'application/json', responseSchema: CLASSIFY_SCHEMA },
    })

    const result = await model.generateContent(prompt)
    const parsed = parseJsonLoose(result.response.text())
    if (!Array.isArray(parsed)) return { error: 'AI 응답을 해석하지 못했습니다. 다시 시도해 주세요.' }

    const assignments = parsed
      .map((a) => ({ category_id: String((a as { category_id?: unknown }).category_id ?? ''), group_name: String((a as { group_name?: unknown }).group_name ?? '').trim() }))
      .filter((a) => a.category_id)

    return { success: true, assignments }
  } catch (error: unknown) {
    console.error('classifyCategoriesWithAI Error:', error)
    const err = error as { message?: string; status?: number }
    if (err.status === 429 || (err.message ?? '').toLowerCase().includes('quota')) {
      return { error: '🚨 무료 토큰 한도를 초과했거나 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }
    }
    return { error: 'AI 분류 중 오류가 발생했습니다.' }
  }
}

// AI 분류 제안 중 관리자가 승인한 변경분만 반영.
// group_name 이 기존 그룹과 (대소문자 무시) 일치하면 그 그룹으로, 새 이름이면 그룹을 생성 후 이동,
// 빈 문자열이면 미분류(null)로 이동한다.
export async function applyClassification(assignments: { category_id: string; group_name: string }[]) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }
  if (!Array.isArray(assignments) || assignments.length === 0) return { error: '적용할 변경이 없습니다.' }

  const supabase = await createClient()
  const { data: grps } = await supabase.from('category_groups').select('id, name')
  const idByName = new Map((grps ?? []).map((g) => [g.name.trim().toLowerCase(), g.id]))

  // 새로 만들어야 하는 그룹명(기존에 없고 비어있지 않은 것) 수집
  const newNames = Array.from(
    new Set(
      assignments
        .map((a) => a.group_name.trim())
        .filter((n) => n && !idByName.has(n.toLowerCase()))
    )
  )

  if (newNames.length > 0) {
    const { data: created, error: cErr } = await supabase
      .from('category_groups')
      .insert(newNames.map((name) => ({ name })))
      .select('id, name')
    if (cErr) return { error: '새 카테고리 생성 중 오류가 발생했습니다.' }
    for (const g of created ?? []) idByName.set(g.name.trim().toLowerCase(), g.id)
  }

  // 목표 그룹별로 분야 id 를 모아 일괄 업데이트
  const byTarget = new Map<string | null, string[]>()
  for (const a of assignments) {
    const gn = a.group_name.trim()
    const targetId = gn ? (idByName.get(gn.toLowerCase()) ?? null) : null
    const arr = byTarget.get(targetId) ?? []
    arr.push(a.category_id)
    byTarget.set(targetId, arr)
  }

  for (const [targetId, ids] of byTarget) {
    const { error } = await supabase.from('categories').update({ group_id: targetId }).in('id', ids)
    if (error) return { error: '분류 반영 중 오류가 발생했습니다.' }
  }

  revalidatePath('/quiz')
  return { success: true, created: newNames.length, moved: assignments.length }
}

// 분야 삭제
export async function deleteCategory(id: string) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const supabase = await createClient()
  const { error } = await supabase.from('categories').delete().eq('id', id)

  if (error) return { error: '삭제 실패: 데이터베이스 제약 조건 또는 오류가 발생했습니다.' }
  revalidatePath('/quiz')
  return { success: true }
}
