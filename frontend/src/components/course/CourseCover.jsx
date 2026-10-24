import { useState } from "react";
import { getCategoryMeta } from "../../lib/courseVisuals";

export default function CourseCover({
  category,
  title = "",
  thumbnailUrl,
  className = "h-44",
  compact = false,
  loading = "lazy",
}) {
  const meta = getCategoryMeta(category);
  const Icon = meta.icon;
  const [failed, setFailed] = useState(false);
  const showImage = thumbnailUrl && !failed;

  return (
    <div
      className={`relative isolate overflow-hidden ${className}`}
      style={
        showImage
          ? undefined
          : { backgroundImage: `linear-gradient(135deg, ${meta.gradient[0]}, ${meta.gradient[1]})` }
      }
    >
      {showImage ? (
        <img
          src={thumbnailUrl}
          alt=""
          loading={loading}
          decoding="async"
          fetchpriority={loading === "eager" ? "high" : "auto"}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <div className="cover-pattern absolute inset-0 opacity-70" aria-hidden="true" />
          <div
            className="absolute -right-10 -top-12 size-40 rounded-full border-[18px] border-white/15"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-16 -left-8 size-36 rounded-full bg-white/10 blur-[1px]"
            aria-hidden="true"
          />
          <Icon
            className={`absolute right-4 top-4 text-white/25 ${
              compact ? "size-10" : "size-16 sm:size-20"
            }`}
            strokeWidth={1.4}
            aria-hidden="true"
          />
        </>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
        <span className="max-w-[75%] truncate rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
          {category || "Course"}
        </span>
        {!compact && title && (
          <span className="truncate rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-md">
            {title}
          </span>
        )}
      </div>
    </div>
  );
}
