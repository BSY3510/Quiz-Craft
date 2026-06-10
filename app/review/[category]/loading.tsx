import { Skeleton } from '@/app/components/Skeleton'

export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900 md:items-center p-4 pt-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-7 w-44" />
          </div>
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-2xl" />
        ))}
      </div>
    </main>
  )
}
