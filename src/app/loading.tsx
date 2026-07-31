import { Skeleton } from '@/components/ui'

export default function Loading() {
  return <main className="editorial-shell space-y-6 py-14 sm:py-20" aria-label="正在加载"><Skeleton className="h-3 w-24" /><Skeleton className="h-16 w-80 max-w-full" /><Skeleton className="h-5 w-[28rem] max-w-full" /><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></main>
}
