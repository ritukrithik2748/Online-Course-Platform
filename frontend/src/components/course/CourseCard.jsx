import { Link } from "react-router-dom";
import { Clock, Users } from "lucide-react";
import CourseCover from "./CourseCover";
import RatingStars from "../ui/RatingStars";
import { compactNumber, formatDuration, formatPrice, levelLabel } from "../../lib/format";

export default function CourseCard({ course }) {
  return (
    <Link
      to={`/courses/${course.course_id}`}
      className="group surface card-hover flex flex-col overflow-hidden focus-visible:ring-2 focus-visible:ring-pink-500"
    >
      <div className="relative">
        <CourseCover
          category={course.category}
          title={course.title}
          thumbnailUrl={course.thumbnail_url}
          className="h-40"
          compact
        />
        <span className="absolute left-3 top-3 badge bg-white/90 text-zinc-700 backdrop-blur dark:bg-zinc-900/85 dark:text-zinc-200">
          {levelLabel(course.level)}
        </span>
        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-extrabold backdrop-blur ${
            Number(course.price) === 0
              ? "bg-emerald-500 text-white"
              : "bg-white/95 text-zinc-900 dark:bg-zinc-900/90 dark:text-white"
          }`}
        >
          {formatPrice(course.price, 'INR')}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ig-pink dark:text-pink-400">
          {course.category}
        </p>
        <h3 className="mt-1.5 line-clamp-2 text-[15px] font-extrabold leading-snug text-zinc-900 transition group-hover:text-ig-pink dark:text-white dark:group-hover:text-pink-400">
          {course.title}
        </h3>
        <p className="mt-1.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
          {course.instructor}
        </p>

        <div className="mt-3 flex items-center gap-1.5">
          {Number(course.review_count) > 0 ? (
            <RatingStars value={course.rating} size={13} showValue count={course.review_count} />
          ) : (
            <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
              New · be the first to review
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-100 pt-3 text-[11px] font-medium text-zinc-500 dark:border-white/10 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {formatDuration(course.duration_hours)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" />
            {compactNumber(course.student_count)} students
          </span>
        </div>
      </div>
    </Link>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="surface overflow-hidden">
      <div className="skeleton h-40 rounded-none" />
      <div className="space-y-3 p-4">
        <div className="skeleton h-2.5 w-20" />
        <div className="skeleton h-4 w-11/12" />
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-3 w-1/2" />
        <div className="divider !mt-4" />
        <div className="flex justify-between">
          <div className="skeleton h-3 w-14" />
          <div className="skeleton h-3 w-20" />
        </div>
      </div>
    </div>
  );
}
