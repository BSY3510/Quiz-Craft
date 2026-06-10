import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateForCategory } from '@/app/admin-secret/auto-pipeline/core'

// 매일 밤(KST 04:00) Vercel Cron 이 호출하는 자동 출제 엔드포인트.
// 로그인 세션이 없으므로 service-role 클라이언트로 RLS 를 우회해 동작한다.
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Vercel Hobby 상한

// 한 번의 실행에서 채울 분야 수·분야당 생성 개수 (60초 한도에 맞춘 보수적 기본값)
const CATEGORIES_PER_RUN = Number(process.env.CRON_CATEGORIES_PER_RUN) || 2
const COUNT_PER_CATEGORY = Number(process.env.CRON_COUNT_PER_CATEGORY) || 5

export async function GET(request: NextRequest) {
  // 1. 인증: Vercel Cron 은 'Authorization: Bearer <CRON_SECRET>' 를 보낸다
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. service-role 클라이언트 (세션 없이 insert 하려면 필수)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY 미설정' }, { status: 500 })
  }
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  // 3. 자동 출제 설정 확인 (활성화 여부 + 분야 선정 모드)
  const { data: cfg } = await supabase
    .from('site_settings')
    .select('auto_generate_enabled, auto_generate_mode, auto_generate_category_ids, auto_generate_count')
    .eq('id', 1)
    .single()
  if (cfg && cfg.auto_generate_enabled === false) {
    return NextResponse.json({ ok: true, skipped: '자동 출제가 비활성화되어 있습니다.' })
  }
  const mode = cfg?.auto_generate_mode === 'selected' ? 'selected' : 'rotation'
  const selectedIds: string[] = Array.isArray(cfg?.auto_generate_category_ids)
    ? (cfg.auto_generate_category_ids as string[])
    : []
  // 분야당 생성 문항 수 (관리자 설정값, 1~20 범위로 보정)
  const perCategoryCount = Math.min(20, Math.max(1, Number(cfg?.auto_generate_count) || COUNT_PER_CATEGORY))

  // 4. 활성 분야 조회 (선택 모드면 관리자가 지정한 분야로 제한)
  const { data: cats, error: catErr } = await supabase
    .from('categories')
    .select('id, name')
    .eq('active', true)
  if (catErr) {
    return NextResponse.json({ error: catErr.message }, { status: 500 })
  }
  if (!cats || cats.length === 0) {
    return NextResponse.json({ ok: true, message: '활성 분야가 없습니다.' })
  }
  const pool = mode === 'selected' ? cats.filter((c) => selectedIds.includes(c.id as string)) : cats
  if (pool.length === 0) {
    return NextResponse.json({ ok: true, message: '자동 출제 대상 분야가 없습니다(선택된 분야 없음).' })
  }

  // 5. 활성 문제 수가 적은 분야 우선 (희소 분야부터 균형 있게 채운다)
  const withCounts = await Promise.all(
    pool.map(async (c) => {
      const { count } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', c.id)
        .eq('status', 'active')
      return { id: c.id as string, name: c.name as string, activeCount: count ?? 0 }
    })
  )
  withCounts.sort((a, b) => a.activeCount - b.activeCount)
  const targets = withCounts.slice(0, CATEGORIES_PER_RUN)

  // 6. 분야별 순차 생성 (Gemini 무료 한도·함수 시간 한도 고려해 순차 처리)
  const results: Array<{ category: string; ok: boolean; detail: unknown }> = []
  for (const t of targets) {
    try {
      const r = await generateForCategory(supabase, t.id, perCategoryCount)
      results.push({ category: t.name, ok: r.ok, detail: r })
    } catch (e) {
      console.error(`Cron generate failed for ${t.name}:`, e)
      results.push({ category: t.name, ok: false, detail: { error: e instanceof Error ? e.message : String(e) } })
    }
  }

  return NextResponse.json({ ok: true, mode, ranAt: new Date().toISOString(), results })
}
