import { Skeleton } from '@/app/components/Skeleton'

export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-50 dark:bg-slate-900 p-4 pt-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-28 w-full rounded-xl mb-6" />
        <Skeleton className="h-5 w-24 mb-4" />
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  )
}
