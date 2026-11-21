// Loading shapes of the education pages, with a screen-reader-only „Зареждане…“.
// Shared by the real pages and the previews. Look (Ореол v3): the list skeleton has
// the bento grid's shape (four cards, wide and narrow); the card skeleton has the
// head and the three parts of one card, so nothing jumps when the content arrives.

import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { bg } from "@/i18n/bg";

export function ListLoading() {
  return (
    <div>
      <p role="status" className="sr-only">
        {bg.common.loading}
      </p>
      <div className="edu-bento" aria-hidden="true">
        {[0, 1, 2, 3].map((tile) => (
          <div key={tile} className="edu-tile edu-tile-skeleton">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="mt-5 h-10 w-3/4" />
            <SkeletonText lines={2} className="mt-4 max-w-[40ch]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardLoading() {
  return (
    <div className="edu-card">
      <p role="status" className="sr-only">
        {bg.common.loading}
      </p>
      <div aria-hidden="true">
        <div className="edu-card-head">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="mt-5 h-16 w-3/4 max-w-2xl" />
        </div>
        <div className="edu-part edu-start">
          <Skeleton className="h-6 w-40" />
          <SkeletonText lines={2} className="mt-5 max-w-[60ch]" />
        </div>
        <div className="edu-part">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-5 h-20 w-full max-w-[40rem] rounded-lg" />
        </div>
        <div className="edu-part">
          <Skeleton className="h-6 w-40" />
          <SkeletonText lines={3} className="mt-5 max-w-[60ch]" />
        </div>
      </div>
    </div>
  );
}
