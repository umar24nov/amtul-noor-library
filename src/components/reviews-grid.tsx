import { Star } from "lucide-react";
import { REVIEWS } from "@/lib/reviews";

/** The full set of Google reviews, as the grid shown on the reviews page. */
export function ReviewsGrid() {
  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {REVIEWS.map((review) => (
        <li
          key={review.name}
          className="flex flex-col rounded-xl border border-border bg-card p-5"
        >
          <span className="flex gap-0.5" aria-label="Rated 5 out of 5 stars">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                className="size-4 text-amber-500"
                fill="currentColor"
                aria-hidden="true"
              />
            ))}
          </span>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {review.quote}
          </p>
          <p className="mt-4 border-t border-border pt-3 text-sm font-medium">
            {review.name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Google review · {review.when}
          </p>
        </li>
      ))}
    </ul>
  );
}