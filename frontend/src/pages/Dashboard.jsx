import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Play,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useMyCourses } from "../hooks/useLearning";
import { useCourses } from "../hooks/useCatalog";
import { useAuth } from "../context/AuthContext";
import CourseCard from "../components/course/CourseCard";
import CourseCover from "../components/course/CourseCover";
import ProgressBar from "../components/ui/ProgressBar";
import { EmptyState, ErrorState } from "../components/ui/StateViews";
import { formatDuration } from "../lib/format";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user, isInstructor } = useAuth();
  const myCourses = useMyCourses();
  const recommendations = useCourses({ sort: "rating", page_size: 8 });
  const courses = myCourses.data || [];

  const stats = useMemo(() => {
    const completed = courses.filter((course) => course.status === "completed").length;
    const active = courses.filter((course) => course.status !== "completed").length;
    const lessonsDone = courses.reduce(
      (total, course) => total + (course.completed_lessons || 0),
      0
    );
    return { completed, active, lessonsDone };
  }, [courses]);

  const continueCourse = useMemo(() => {
    if (!courses.length) return null;
    const inProgress = courses.find(
      (course) => course.status !== "completed" && Number(course.progress_percent) > 0
    );
    return (
      inProgress ||
      courses.find((course) => course.status !== "completed") ||
      courses[0]
    );
  }, [courses]);

  const enrolledIds = new Set(courses.map((course) => course.course_id));
  const recommended = (recommendations.data?.items || [])
    .filter((course) => !enrolledIds.has(course.course_id))
    .slice(0, 3);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80">
        <div className="ig-gradient-soft absolute inset-0 opacity-70" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#fbfafc] dark:to-zinc-950" />
      </div>

      <div className="container-page py-10 sm:py-14">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ig-pink">
              Your learning
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {greeting()}, {user?.first_name}.
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {continueCourse
                ? "A little progress today compounds. Pick up where you left off."
                : "Your next favorite course is a few clicks away."}
            </p>
          </div>
          <Link to="/courses" className="btn btn-secondary w-fit">
            Explore courses
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {isInstructor && (
          <div className="mt-6 flex flex-col justify-between gap-3 rounded-3xl border border-purple-200/70 bg-purple-50/70 p-5 dark:border-purple-500/20 dark:bg-purple-500/10 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-ig-purple dark:bg-white/10 dark:text-purple-300">
                <GraduationCap className="size-5" />
              </span>
              <div>
                <p className="text-sm font-bold">You teach on LearNova</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Manage your courses, curriculum and student progress.
                </p>
              </div>
            </div>
            <Link to="/instructor" className="btn btn-secondary w-fit">
              Open instructor studio
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: BookOpen, label: "Enrolled courses", value: courses.length },
            { icon: TrendingUp, label: "In progress", value: stats.active },
            { icon: Award, label: "Completed", value: stats.completed },
            { icon: CheckCircle2, label: "Lessons finished", value: stats.lessonsDone },
          ].map((item) => (
            <div key={item.label} className="surface p-4 sm:p-5">
              <div className="flex items-center gap-2 text-zinc-400">
                <item.icon className="size-4" />
                <span className="text-[11px] font-semibold uppercase tracking-wide">
                  {item.label}
                </span>
              </div>
              <p className="mt-2 text-2xl font-extrabold sm:text-3xl">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Continue */}
        {myCourses.isLoading && (
          <div className="mt-6 space-y-4">
            <div className="surface h-52 animate-pulse" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="surface h-56 animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {myCourses.isError && (
          <div className="mt-6">
            <ErrorState
              title="We could not load your courses"
              description={myCourses.error?.message || "Please try again in a moment."}
              onRetry={() => myCourses.refetch()}
            />
          </div>
        )}

        {!myCourses.isLoading && !myCourses.isError && courses.length === 0 && (
          <div className="mt-8">
            <EmptyState
              icon={Sparkles}
              title="Your learning journey starts here"
              description="Enroll in a course and your progress, next lesson and completed work will all live here."
              action={
                <Link to="/courses" className="btn btn-primary">
                  Find your first course
                  <ArrowRight className="size-4" />
                </Link>
              }
            />
          </div>
        )}

        {continueCourse && (
          <div className="surface mt-6 overflow-hidden">
            <div className="grid md:grid-cols-[280px_1fr]">
              <div className="relative min-h-40">
                <CourseCover
                  category={continueCourse.category}
                  title={continueCourse.title}
                  thumbnailUrl={continueCourse.thumbnail_url}
                  className="h-full min-h-40"
                  compact
                />
              </div>
              <div className="flex flex-col justify-center p-5 sm:p-7">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge bg-pink-50 text-ig-pink dark:bg-pink-500/10 dark:text-pink-300">
                    Continue learning
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-400">
                    {continueCourse.category}
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">
                  {continueCourse.title}
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {continueCourse.instructor} ·{" "}
                  {continueCourse.next_lesson_title
                    ? `Next: ${continueCourse.next_lesson_title}`
                    : "All lessons completed"}
                </p>

                <div className="mt-4 max-w-md">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                      {continueCourse.completed_lessons} of {continueCourse.total_lessons} lessons
                    </span>
                    <span className="font-bold text-ig-pink">
                      {Math.round(continueCourse.progress_percent)}%
                    </span>
                  </div>
                  <ProgressBar value={continueCourse.progress_percent} />
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link
                    to={`/learn/${continueCourse.course_id}${
                      continueCourse.next_lesson_id
                        ? `?lesson=${continueCourse.next_lesson_id}`
                        : ""
                    }`}
                    className="btn btn-primary"
                  >
                    <Play className="size-4 fill-current" />
                    {Number(continueCourse.progress_percent) > 0 ? "Resume" : "Start"} learning
                  </Link>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <Clock className="size-3.5" />
                    {formatDuration(continueCourse.duration_hours)} total
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {courses.length > 0 && (
          <section className="mt-10">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">My courses</h2>
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {courses.length} {courses.length === 1 ? "course" : "courses"}
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <EnrolledCard key={course.enrollment_id} course={course} />
              ))}
            </div>
          </section>
        )}

        {/* Recommendations */}
        <section className="mt-12">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ig-pink">
                Because you’re curious
              </p>
              <h2 className="mt-1.5 text-xl font-extrabold tracking-tight sm:text-2xl">
                Recommended for you
              </h2>
            </div>
            <Link
              to="/courses?sort=rating"
              className="text-sm font-bold text-zinc-600 transition hover:text-ig-pink dark:text-zinc-300 dark:hover:text-pink-400"
            >
              View all
            </Link>
          </div>

          {recommendations.isLoading && (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="surface h-72 animate-pulse" />
              ))}
            </div>
          )}

          {recommendations.isError && (
            <p className="mt-5 text-sm text-zinc-500">
              Recommendations are unavailable right now.{" "}
              <Link to="/courses" className="font-bold text-ig-pink">
                Browse the catalog
              </Link>
              .
            </p>
          )}

          {!recommendations.isLoading && recommended.length > 0 && (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recommended.map((course) => (
                <CourseCard key={course.course_id} course={course} />
              ))}
            </div>
          )}

          {!recommendations.isLoading && !recommendations.isError && recommended.length === 0 && (
            <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-400">
              You are enrolled in every great course we have. New ones land weekly.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function EnrolledCard({ course }) {
  const percent = Number(course.progress_percent) || 0;
  const completed = course.status === "completed";
  return (
    <div className="surface card-hover flex flex-col overflow-hidden">
      <Link to={`/courses/${course.course_id}`} className="block">
        <CourseCover
          category={course.category}
          title={course.title}
          thumbnailUrl={course.thumbnail_url}
          className="h-32"
          compact
        />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {course.category}
          </span>
          {completed ? (
            <span className="badge bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              Completed
            </span>
          ) : (
            <span className="text-[10px] font-bold text-ig-pink">{Math.round(percent)}%</span>
          )}
        </div>
        <Link
          to={`/courses/${course.course_id}`}
          className="mt-1.5 line-clamp-2 text-sm font-extrabold leading-snug transition hover:text-ig-pink dark:hover:text-pink-400"
        >
          {course.title}
        </Link>
        <p className="mt-1 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
          {course.instructor}
        </p>

        <div className="mt-3">
          <ProgressBar value={percent} size="sm" />
          <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
            <span>
              {course.completed_lessons}/{course.total_lessons} lessons
            </span>
            <span>{formatDuration(course.duration_hours)}</span>
          </div>
        </div>

        <Link
          to={`/learn/${course.course_id}${
            course.next_lesson_id ? `?lesson=${course.next_lesson_id}` : ""
          }`}
          className="btn btn-secondary mt-4 w-full !py-2"
        >
          <Play className="size-3.5 fill-current" />
          {completed ? "Review course" : percent > 0 ? "Continue" : "Start course"}
        </Link>
      </div>
    </div>
  );
}
