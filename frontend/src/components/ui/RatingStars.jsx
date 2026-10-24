import { Star } from "lucide-react";

export default function RatingStars({
  value = 0,
  count,
  size = 14,
  showValue = false,
  className = "",
}) {
  const rounded = Math.round(Number(value) || 0);
  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      aria-label={`Rated ${Number(value || 0).toFixed(1)} out of 5${
        count !== undefined ? ` from ${count} ${count === 1 ? "review" : "reviews"}` : ""
      }`}
    >
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            style={{ width: size, height: size }}
            className={
              star <= rounded
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-zinc-300 dark:text-zinc-600"
            }
            strokeWidth={2}
          />
        ))}
      </span>
      {showValue && (
        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
          {Number(value || 0).toFixed(1)}
        </span>
      )}
      {count !== undefined && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">({count})</span>
      )}
    </span>
  );
}
