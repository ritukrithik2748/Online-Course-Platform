import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  CirclePlay,
  Clock,
  FileText,
  Loader2,
  Lock,
  Play,
  ShieldCheck,
  Star,
  Users,
  Video,
} from "lucide-react";
import { useCourse, useReviews, useSubmitReview } from "../hooks/useCatalog";
import { useEnroll } from "../hooks/useLearning";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import CourseCover from "../components/course/CourseCover";
import Avatar from "../components/ui/Avatar";
import RatingStars from "../components/ui/RatingStars";
import ProgressBar from "../components/ui/ProgressBar";
import { ErrorState } from "../components/ui/StateViews";
import {
  compactNumber,
  formatDate,
  formatDuration,
  formatLessonLength,
  formatPrice,
  levelLabel,
  pluralize,
} from "../lib/format";
import { validateReview } from "../lib/validation";
import { getCategoryMeta } from "../lib/courseVisuals";

function DetailSkeleton() {
  return (
    <div className="container-page py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="skeleton h-3 w-40" />
          <div className="skeleton h-9 w-4/5" />
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton mt-6 h-64 w-full rounded-3xl" />
        </div>
        <div className="skeleton h-80 rounded-3xl" />
      </div>
    </div>
  );
}

export default function CourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { success, error: toastError } = useToast();
  const courseQuery = useCourse(courseId);
  const reviewsQuery = useReviews(courseId);
  const enrollMutation = useEnroll(courseId);
  const reviewMutation = useSubmitReview(courseId);

  const course = courseQuery.data;
  const [openSections, setOpenSections] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewErrors, setReviewErrors] = useState({});

  const myReview = reviewsQuery.data?.items?.find((review) => review.user_id === user?.user_id);

  useEffect(() => {
    if (course?.sections?.length) {
      setOpenSections([course.sections[0].section_id]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.course_id]);

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setComment(myReview.comment || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myReview?.review_id]);

  const toggleSection = (sectionId) => {
    setOpenSections((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId]
    );
  };

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    try {
      await enrollMutation.mutateAsync();
      success("You’re enrolled", "Your first lesson is ready when you are.");
      navigate(`/learn/${courseId}`);
    } catch (error) {
      toastError("Could not enroll", error.message);
    }
  };

  const handleReview = async (event) => {
    event.preventDefault();
    const errors = validateReview({ rating, comment });
    setReviewErrors(errors);
    if (Object.keys(errors).length) return;
    try {
      await reviewMutation.mutateAsync({ rating, comment: comment.trim() || null });
      success("Review saved", "Thanks for helping other learners decide.");
    } catch (error) {
      toastError("Could not save review", error.message);
    }
  };

  if (courseQuery.isLoading) return <DetailSkeleton />;

  if (courseQuery.isError) {
    const notFound = courseQuery.error?.status === 404;
    return (
      <div className="container-page py-16">
        <ErrorState
          title={notFound ? "This course is not available" : "We could not load this course"}
          description={
            notFound
              ? "It may have been unpublished or the link may be wrong."
              : courseQuery.error?.message || "Please try again in a moment."
          }
          onRetry={notFound ? undefined : () => courseQuery.refetch()}
        />
        <div className="mt-6 text-center">
          <Link to="/courses" className="btn btn-secondary">
            <ArrowLeft className="size-4" />
            Back to catalog
          </Link>
        </div>
      </div>
    );
  }

  if (!course) return null;

  const meta = getCategoryMeta(course.category?.name);
  const isEnrolled = course.is_enrolled;
  const isOwner = course.is_owner;
  const canReview = isEnrolled && !isOwner;
  const completed = course.progress_percent || 0;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-200/70 dark:border-white/10">
        <div
          className="absolute inset-0 -z-10 opacity-[0.12] dark:opacity-20"
          style={{
            backgroundImage: `linear-gradient(120deg, ${meta.gradient[0]}, ${meta.gradient[1]})`,
          }}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 -z-10 size-96 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="container-page py-8 sm:py-12">
          <nav className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-ig-pink">
              Home
            </Link>
            <span>/</span>
            <Link to="/courses" className="hover:text-ig-pink">
              Courses
            </Link>
            <span>/</span>
            <Link
              to={`/courses?category_id=${course.category?.category_id}`}
              className="hover:text-ig-pink"
            >
              {course.category?.name}
            </Link>
          </nav>

          <div className="mt-5 max-w-3xl animate-fade-up">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge bg-white/80 text-ig-pink dark:bg-white/10 dark:text-pink-300">
                  {course.category?.name}
                </span>
                <span className="badge bg-zinc-900/5 text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                  {levelLabel(course.level)}
                </span>
                {course.status !== "published" && (
                  <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                    {course.status}
                  </span>
                )}
              </div>

              <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">
                {course.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300 sm:text-base">
                {course.description?.split("\n")[0]}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                <span className="inline-flex items-center gap-1.5">
                  <RatingStars value={course.rating} size={15} showValue />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    ({course.review_count} {course.review_count === 1 ? "review" : "reviews"})
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <Users className="size-4 text-zinc-400" />
                  {compactNumber(course.student_count)} students
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <Clock className="size-4 text-zinc-400" />
                  {formatDuration(course.duration_hours)}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <BookOpen className="size-4 text-zinc-400" />
                  {course.lesson_count} {pluralize(course.lesson_count, "lesson")}
                </span>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <Avatar name={course.instructor?.name} src={course.instructor?.profile_picture} size="sm" />
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Created by</p>
                  <p className="text-sm font-bold">{course.instructor?.name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-14">
        <aside className="order-first lg:order-last lg:sticky lg:top-24 lg:h-fit">
          <EnrollCard
            course={course}
            isEnrolled={isEnrolled}
            isOwner={isOwner}
            isAuthenticated={isAuthenticated}
            enrollMutation={enrollMutation}
            completed={completed}
            onEnroll={handleEnroll}
          />
        </aside>

        <div className="min-w-0 space-y-10 lg:order-first">
          {/* About */}
          <section>
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">About this course</h2>
            <p className="prose-copy mt-4">{course.description}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Clock, label: `${formatDuration(course.duration_hours)} of content` },
                { icon: BookOpen, label: `${course.section_count} ${pluralize(course.section_count, "section")} · ${course.lesson_count} ${pluralize(course.lesson_count, "lesson")}` },
                { icon: ShieldCheck, label: "Lifetime access after enrolling" },
                { icon: CirclePlay, label: "Preview lessons before you enroll" },
              ].map((item) => (
                <div key={item.label} className="surface-muted flex items-center gap-3 p-3.5">
                  <item.icon className="size-4 shrink-0 text-ig-pink" />
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Curriculum */}
          <section id="curriculum">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Course content</h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {course.section_count} {pluralize(course.section_count, "section")} ·{" "}
                  {course.lesson_count} {pluralize(course.lesson_count, "lesson")} ·{" "}
                  {formatDuration(course.duration_hours)}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {course.sections?.length === 0 && (
                <div className="surface-muted p-5 text-sm text-zinc-500 dark:text-zinc-400">
                  This course does not have lessons yet. Check back soon.
                </div>
              )}

              {course.sections?.map((section) => {
                const open = openSections.includes(section.section_id);
                const sectionMinutes = section.lessons.reduce(
                  (total, lesson) => total + (lesson.duration_minutes || 0),
                  0
                );
                return (
                  <div key={section.section_id} className="surface overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleSection(section.section_id)}
                      className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-zinc-50 dark:hover:bg-white/5"
                      aria-expanded={open}
                    >
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-extrabold">{section.title}</h3>
                        <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                          {section.lessons.length} {pluralize(section.lessons.length, "lesson")} ·{" "}
                          {formatLessonLength(sectionMinutes)}
                        </p>
                      </div>
                      <ChevronDown
                        className={`size-4 shrink-0 text-zinc-400 transition ${
                          open ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {open && (
                      <ul className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-white/5 dark:border-white/5">
                        {section.lessons.map((lesson) => {
                          const locked = !course.has_access && !lesson.is_preview;
                          const LessonIcon =
                            lesson.content_type === "video"
                              ? Video
                              : lesson.content_type === "pdf"
                                ? FileText
                                : BookOpen;
                          const inner = (
                            <>
                              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-300">
                                {lesson.is_completed && isEnrolled ? (
                                  <CheckCircle2 className="size-4 text-emerald-500" />
                                ) : locked ? (
                                  <Lock className="size-3.5" />
                                ) : (
                                  <LessonIcon className="size-4" />
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                    {lesson.title}
                                  </span>
                                  {lesson.is_preview && (
                                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                                      Preview
                                    </span>
                                  )}
                                </span>
                              </span>
                              <span className="shrink-0 text-[11px] text-zinc-400">
                                {formatLessonLength(lesson.duration_minutes)}
                              </span>
                            </>
                          );

                          return (
                            <li key={lesson.lesson_id}>
                              {locked ? (
                                <div className="flex items-center gap-3 px-4 py-3 opacity-60">
                                  {inner}
                                </div>
                              ) : (
                                <Link
                                  to={`/learn/${course.course_id}?lesson=${lesson.lesson_id}`}
                                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-pink-50/60 dark:hover:bg-pink-500/5"
                                >
                                  {inner}
                                </Link>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Instructor */}
          <section id="instructor">
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Your instructor</h2>
            <div className="surface mt-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-4">
                <Avatar
                  name={course.instructor?.name}
                  src={course.instructor?.profile_picture}
                  size="lg"
                  ring
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold">{course.instructor?.name}</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {course.instructor?.years_of_experience
                      ? `${course.instructor.years_of_experience}+ years of experience · `
                      : ""}
                    {course.instructor?.courses_count} published{" "}
                    {course.instructor?.courses_count === 1 ? "course" : "courses"}
                  </p>
                  <div className="mt-1.5">
                    <RatingStars value={course.instructor?.rating || 0} size={13} showValue />
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {course.instructor?.bio ||
                  "This instructor is still writing their bio. Their lessons speak for themselves."}
              </p>
            </div>
          </section>

          {/* Reviews */}
          <section id="reviews">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                Student reviews
              </h2>
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {course.review_count} {course.review_count === 1 ? "review" : "reviews"}
              </span>
            </div>

            {reviewsQuery.isLoading && (
              <div className="mt-5 space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="surface p-4">
                    <div className="skeleton h-4 w-32" />
                    <div className="skeleton mt-3 h-3 w-full" />
                    <div className="skeleton mt-2 h-3 w-2/3" />
                  </div>
                ))}
              </div>
            )}

            {reviewsQuery.isError && (
              <div className="mt-5">
                <ErrorState
                  title="Reviews are unavailable"
                  description={reviewsQuery.error?.message || "Please try again shortly."}
                  onRetry={() => reviewsQuery.refetch()}
                />
              </div>
            )}

            {reviewsQuery.data && (
              <div className="mt-5 grid gap-6 lg:grid-cols-[260px_1fr]">
                <div className="surface h-fit p-5">
                  <p className="text-4xl font-extrabold">{Number(reviewsQuery.data.average).toFixed(1)}</p>
                  <RatingStars value={reviewsQuery.data.average} size={16} className="mt-1" />
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {reviewsQuery.data.count} course {reviewsQuery.data.count === 1 ? "rating" : "ratings"}
                  </p>
                  <div className="mt-4 space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = reviewsQuery.data.distribution?.[String(star)] || 0;
                      const percent = reviewsQuery.data.count
                        ? (count / reviewsQuery.data.count) * 100
                        : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-[11px]">
                          <span className="flex w-8 items-center gap-0.5 text-zinc-500 dark:text-zinc-400">
                            {star} <Star className="size-3 fill-amber-400 text-amber-400" />
                          </span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
                            <div
                              className="h-full rounded-full bg-amber-400"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="w-5 text-right text-zinc-400">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  {reviewsQuery.data.items.length === 0 && (
                    <div className="surface-muted p-5 text-sm text-zinc-500 dark:text-zinc-400">
                      No written reviews yet. Be the first once you have started the course.
                    </div>
                  )}

                  {reviewsQuery.data.items.map((review) => (
                    <article key={review.review_id} className="surface p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <Avatar
                          name={`${review.first_name} ${review.last_name}`}
                          src={review.profile_picture}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold">
                              {review.first_name} {review.last_name}
                            </p>
                            <span className="text-[11px] text-zinc-400">
                              {formatDate(review.created_at)}
                            </span>
                          </div>
                          <RatingStars value={review.rating} size={13} className="mt-1" />
                          {review.comment && (
                            <p className="mt-2.5 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                              {review.comment}
                            </p>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {canReview && (
              <form onSubmit={handleReview} className="surface mt-6 p-5 sm:p-6">
                <h3 className="text-base font-extrabold">
                  {myReview ? "Update your review" : "Share your experience"}
                </h3>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Your review helps other learners choose with confidence.
                </p>

                <div className="mt-4 flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="rounded-full p-1 transition hover:scale-110"
                      aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
                      aria-pressed={rating === star}
                    >
                      <Star
                        className={`size-6 ${
                          star <= rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-transparent text-zinc-300 dark:text-zinc-600"
                        }`}
                      />
                    </button>
                  ))}
                  {reviewErrors.rating && (
                    <span className="ml-1 text-xs text-red-500">{reviewErrors.rating}</span>
                  )}
                </div>

                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={4}
                  className="input mt-4 resize-y"
                  placeholder="What did you like? What could be better?"
                  aria-label="Your review"
                />
                {reviewErrors.comment && (
                  <p className="field-error">{reviewErrors.comment}</p>
                )}

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-zinc-400">Reviews are public and tied to your name.</p>
                  <button
                    type="submit"
                    disabled={reviewMutation.isPending}
                    className="btn btn-primary"
                  >
                    {reviewMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                    {myReview ? "Update review" : "Submit review"}
                  </button>
                </div>
              </form>
            )}

            {!canReview && isAuthenticated && !isOwner && (
              <div className="surface-muted mt-6 flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  Enroll to leave a review and track your progress.
                </p>
                <button
                  type="button"
                  onClick={handleEnroll}
                  disabled={enrollMutation.isPending}
                  className="btn btn-secondary"
                >
                  Enroll to review
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function EnrollCard({
  course,
  isEnrolled,
  isOwner,
  isAuthenticated,
  enrollMutation,
  completed,
  onEnroll,
}) {
  return (
    <div className="surface animate-fade-up overflow-hidden shadow-[var(--shadow-soft)] animation-delay-100 lg:sticky lg:top-24">
      <CourseCover
        category={course.category?.name}
        title={course.title}
        thumbnailUrl={course.thumbnail_url}
        className="h-40"
      />
      <div className="p-5">
        <div className="flex items-end justify-between gap-3">
          <p className="text-3xl font-extrabold">{formatPrice(course.price)}</p>
          {Number(course.price) === 0 && (
            <span className="badge bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              Free forever
            </span>
          )}
        </div>

        {isEnrolled ? (
          <>
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-600 dark:text-zinc-300">Your progress</span>
                <span className="font-bold text-ig-pink">{Math.round(completed)}%</span>
              </div>
              <ProgressBar value={completed} />
            </div>
            <Link to={`/learn/${course.course_id}`} className="btn btn-primary mt-4 w-full !py-3">
              <Play className="size-4 fill-current" />
              Continue learning
            </Link>
          </>
        ) : isOwner ? (
          <Link
            to={`/instructor/courses/${course.course_id}`}
            className="btn btn-primary mt-4 w-full !py-3"
          >
            Manage this course
            <ArrowRight className="size-4" />
          </Link>
        ) : (
          <>
            <button
              type="button"
              onClick={onEnroll}
              disabled={enrollMutation.isPending}
              className="btn btn-primary mt-4 w-full !py-3"
            >
              {enrollMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Enrolling…
                </>
              ) : (
                <>
                  {Number(course.price) === 0 ? "Enroll for free" : "Enroll now"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
            {!isAuthenticated && (
              <p className="mt-2 text-center text-[11px] text-zinc-400">
                You’ll be asked to log in or create a free account.
              </p>
            )}
          </>
        )}

        {enrollMutation.isError && (
          <p className="field-error justify-center">{enrollMutation.error.message}</p>
        )}

        <div className="mt-5 space-y-2.5 border-t border-zinc-100 pt-4 text-xs text-zinc-600 dark:border-white/10 dark:text-zinc-300">
          {[
            `${course.lesson_count} ${pluralize(course.lesson_count, "lesson")} across ${course.section_count} ${pluralize(course.section_count, "section")}`,
            `${formatDuration(course.duration_hours)} of on-demand content`,
            "Learn on your own schedule",
            "Preview lessons before enrolling",
          ].map((item) => (
            <p key={item} className="flex items-start gap-2">
              <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
              {item}
            </p>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-zinc-50 p-3 dark:bg-white/5">
          <ShieldCheck className="size-4 shrink-0 text-emerald-500" />
          <p className="text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
            Your progress is saved automatically, lesson by lesson.
          </p>
        </div>
      </div>
    </div>
  );
}
