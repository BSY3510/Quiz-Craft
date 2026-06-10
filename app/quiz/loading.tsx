import { Skeleton } from '@/app/components/Skeleton'

export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900 md:items-center">
      <div className="w-full max-w-md p-4 pt-8 space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-6 w-32" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </main>
  )
}
