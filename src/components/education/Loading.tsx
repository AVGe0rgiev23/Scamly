// Loading shapes of the education pages: skeletons of the list rows and of one card,
// with a screen-reader-only „Зареждане…“. Shared by the real pages and the previews.

import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { bg } from "@/i18n/bg";

export function ListLoading() {
  return (
    <div className="border-t border-line">
      <p role="status" className="sr-only">
        {bg.common.loading}
      </p>
      {[0, 1, 2].map((row) => (
        <div key={row} className="border-b border-line py-8 md:py-10" aria-hidden="true">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="mt-4 h-10 w-3/4 max-w-xl" />
          <SkeletonText lines={2} className="mt-4 max-w-[60ch]" />
        </div>
      ))}
    </div>
  );
}

export function CardLoading() {
  return (
    <div>
      <p role="status" className="sr-only">
        {bg.common.loading}
      </p>
      <Skeleton className="h-6 w-24" />
      <Skeleton className="mt-4 h-16 w-3/4 max-w-2xl" />
      <div className="mt-14 border-t border-line pt-10">
        <SkeletonText lines={3} className="max-w-[60ch]" />
      </div>
      <div className="mt-10 border-t border-line pt-10">
        <SkeletonText lines={3} className="max-w-[60ch]" />
      </div>
    </div>
  );
}
