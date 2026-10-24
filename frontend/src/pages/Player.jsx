import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  FileText,
  Loader2,
  Lock,
  Play,
  Video,
} from "lucide-react";
import { useCourseContent, useUpdateProgress } from "../hooks/useLearning";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import ProgressBar from "../components/ui/ProgressBar";
import { EmptyState, ErrorState } from "../components/ui/StateViews";
import { formatDuration, formatLessonLength } from "../lib/format";

function embedUrl(url) {
  if (!url) return null;
  const youtube = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function isDirectVideo(url) {
  return Boolean(url && /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url));
}

function PlayerSkeleton() {
  return (
    <div className="container-page py-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="skeleton h-4 w-52" />
          <div className="skeleton aspect-video w-full rounded-3xl" />
          <div className="skeleton h-6 w-2/3" />
          <div className="skeleton h-4 w-1/3" />
        </div>
        <div className="skeleton h-[520px] rounded-3xl" />
      </div>
    </div>
  );
}

export default function Player() {
  const { courseId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { success, error: toastError, info } = useToast();
  const contentQuery = useCourseContent(courseId);
  const updateProgress = useUpdateProgress(courseId);
  const videoRef = useRef(null);
  const lastSavedRef = useRef(0);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [videoError, setVideoError] = useState(false);

  const content = contentQuery.data;
  const sections = content?.sections || [];
  const lessons = useMemo(
    () =>
      sections.flatMap((section) =>
        section.lessons.map((lesson) => ({
          ...lesson,
          sectionTitle: section.title,
        }))
      ),
    [sections]
  );
  const completedCount = lessons.filter((lesson) => lesson.is_completed).length;
  const currentLesson =
    lessons.find((lesson) => lesson.lesson_id === activeLessonId) || lessons[0] || null;
  const currentIndex = currentLesson
    ? lessons.findIndex((lesson) => lesson.lesson_id === currentLesson.lesson_id)
    : -1;
  const previousLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  const requestedLessonId = Number(searchParams.get("lesson")) || null;

  useEffect(() => {
    if (!lessons.length) return;
    const fromUrl = lessons.find((lesson) => lesson.lesson_id === requestedLessonId);
    if (fromUrl) {
      setActiveLessonId(fromUrl.lesson_id);
      return;
    }
    const firstIncomplete = lessons.find((lesson) => !lesson.is_completed);
    const fallback = firstIncomplete || lessons[0];
    setActiveLessonId(fallback.lesson_id);
    setSearchParams({ lesson: String(fallback.lesson_id) }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.course_id, lessons.length, requestedLessonId]);

  useEffect(() => {
    setVideoError(false);
    lastSavedRef.current = 0;
  }, [currentLesson?.lesson_id]);

  const selectLesson = (lesson) => {
    setActiveLessonId(lesson.lesson_id);
    setSearchParams({ lesson: String(lesson.lesson_id) }, { replace: true });
  };

  const markLesson = async (isCompleted) => {
    if (!currentLesson || !content?.is_enrolled) return;
    try {
      const result = await updateProgress.mutateAsync({
        lessonId: currentLesson.lesson_id,
        isCompleted,
      });
      if (isCompleted) {
        success("Lesson complete", `Course progress is now ${Math.round(result.progress_percent)}%.`);
      } else {
        info("Marked as not complete", "You can rewatch the lesson any time.");
      }
    } catch (error) {
      toastError("Could not update progress", error.message);
    }
  };

  const savePosition = (seconds) => {
    if (!currentLesson || !content?.is_enrolled) return;
    if (!seconds || seconds < 5) return;
    if (Math.abs(seconds - lastSavedRef.current) < 8) return;
    lastSavedRef.current = seconds;
    updateProgress.mutate({
      lessonId: currentLesson.lesson_id,
      isCompleted: currentLesson.is_completed,
      position: Math.round(seconds),
    });
  };

  if (contentQuery.isLoading) return <PlayerSkeleton />;

  if (contentQuery.isError) {
    return (
      <div className="container-page py-16">
        <ErrorState
          title="We could not open this course"
          description={contentQuery.error?.message || "Please try again in a moment."}
          onRetry={() => contentQuery.refetch()}
        />
        <div className="mt-6 text-center">
          <Link to={`/courses/${courseId}`} className="btn btn-secondary">
            <ArrowLeft className="size-4" />
            Back to course
          </Link>
        </div>
      </div>
    );
  }

  if (!content || lessons.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={Video}
          title="This course has no lessons yet"
          description="The instructor is still building the curriculum. Check back soon."
          action={
            <Link to={`/courses/${courseId}`} className="btn btn-primary">
              Back to course
            </Link>
          }
        />
      </div>
    );
  }

  const percent = content.progress_percent || 0;
  const locked = !content.has_access && !currentLesson.is_preview;
  const canTrack = content.is_enrolled;
  const embed = embedUrl(currentLesson.content_url);
  const directVideo = isDirectVideo(currentLesson.content_url);
  const ContentIcon =
    currentLesson.content_type === "video"
      ? Video
      : currentLesson.content_type === "pdf"
        ? FileText
        : BookOpen;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64">
        <div className="ig-gradient-soft absolute inset-0 opacity-50" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[#fbfafc] dark:to-zinc-950" />
      </div>

      <div className="container-page py-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to={`/courses/${courseId}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 transition hover:text-ig-pink dark:text-zinc-400 dark:hover:text-pink-400"
          >
            <ArrowLeft className="size-4" />
            Back to course
          </Link>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
            <span>
              Lesson {currentIndex + 1} of {lessons.length}
            </span>
            <span className="text-zinc-300 dark:text-zinc-600">·</span>
            <span>{Math.round(percent)}% complete</span>
          </div>
        </div>

        <div className="mt-3 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
            {/* Video / content */}
            <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-zinc-950 shadow-[var(--shadow-soft)] dark:border-white/10">
              <div className="aspect-video w-full">
                {locked ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 text-center text-white">
                    <span className="flex size-14 items-center justify-center rounded-full bg-white/10">
                      <Lock className="size-6" />
                    </span>
                    <p className="text-lg font-bold">This lesson is for enrolled students</p>
                    <p className="max-w-sm text-sm text-white/70">
                      Preview lessons are free. Enroll to unlock the full course and track your
                      progress.
                    </p>
                    <Link to={`/courses/${courseId}`} className="btn btn-primary mt-1">
                      See enrollment options
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                ) : currentLesson.content_type === "video" && directVideo && !videoError ? (
                  <video
                    ref={videoRef}
                    key={currentLesson.lesson_id}
                    src={currentLesson.content_url}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full bg-black object-contain"
                    onLoadedMetadata={(event) => {
                      if (currentLesson.last_watched_position > 0) {
                        event.currentTarget.currentTime = currentLesson.last_watched_position;
                      }
                    }}
                    onPause={(event) => savePosition(event.currentTarget.currentTime)}
                    onEnded={() => {
                      savePosition(0);
                      if (canTrack && !currentLesson.is_completed) markLesson(true);
                    }}
                    onError={() => setVideoError(true)}
                  />
                ) : currentLesson.content_type === "video" && embed ? (
                  <iframe
                    key={currentLesson.lesson_id}
                    src={embed}
                    title={currentLesson.title}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : currentLesson.content_type === "video" ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 text-center text-white">
                    <span className="flex size-14 items-center justify-center rounded-full bg-white/10">
                      <Video className="size-6" />
                    </span>
                    <p className="text-sm font-semibold">
                      {videoError || !currentLesson.content_url
                        ? "This video could not be played here"
                        : "This video opens in a new tab"}
                    </p>
                    <p className="max-w-sm text-xs leading-5 text-white/60">
                      The lesson may use a hosting provider that does not allow embedding. You can
                      still open the source directly.
                    </p>
                    {currentLesson.content_url && (
                      <a
                        href={currentLesson.content_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="btn mt-1 bg-white text-zinc-900 hover:bg-zinc-100"
                      >
                        <CirclePlay className="size-4" />
                        Open lesson video
                      </a>
                    )}
                  </div>
                ) : currentLesson.content_url ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 text-center text-white">
                    <span className="flex size-14 items-center justify-center rounded-full bg-white/10">
                      <ContentIcon className="size-6" />
                    </span>
                    <p className="text-lg font-bold">{currentLesson.title}</p>
                    <p className="max-w-sm text-xs leading-5 text-white/60">
                      This lesson is a {currentLesson.content_type} resource. Open it in a new tab,
                      then come back and mark the lesson complete.
                    </p>
                    <a
                      href={currentLesson.content_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="btn mt-1 bg-white text-zinc-900 hover:bg-zinc-100"
                    >
                      Open {currentLesson.content_type === "pdf" ? "PDF" : "article"}
                      <ArrowRight className="size-4" />
                    </a>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 text-center text-white">
                    <ContentIcon className="size-8 text-white/60" />
                    <p className="text-sm font-semibold">No content attached yet</p>
                    <p className="text-xs text-white/60">
                      The instructor has not added a video or file for this lesson.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {!content.is_enrolled && (
              <div className="mt-4 flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200 sm:flex-row sm:items-center">
                <p className="flex items-center gap-2">
                  <Play className="size-4 shrink-0" />
                  {content.is_owner
                    ? "Instructor preview. Enrollments start when students join."
                    : "You’re previewing this course. Enroll to unlock every lesson and save progress."}
                </p>
                {!content.is_owner && (
                  <Link
                    to={isAuthenticated ? `/courses/${courseId}` : `/login?next=/courses/${courseId}`}
                    className="btn btn-secondary !py-2 text-xs"
                  >
                    {isAuthenticated ? "Enroll now" : "Log in to enroll"}
                  </Link>
                )}
              </div>
            )}

            <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge bg-pink-50 text-ig-pink dark:bg-pink-500/10 dark:text-pink-300">
                    {currentLesson.sectionTitle}
                  </span>
                  {currentLesson.is_preview && (
                    <span className="badge bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                      Preview
                    </span>
                  )}
                </div>
                <h1 className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">
                  {currentLesson.title}
                </h1>
                <p className="mt-1 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <ContentIcon className="size-3.5" />
                    {currentLesson.content_type === "video"
                      ? "Video lesson"
                      : currentLesson.content_type === "pdf"
                        ? "PDF resource"
                        : "Article"}
                  </span>
                  <span>·</span>
                  <span>{formatLessonLength(currentLesson.duration_minutes)}</span>
                  {currentLesson.is_completed && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3.5" />
                        Completed
                      </span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                {canTrack && (
                  <button
                    type="button"
                    onClick={() => markLesson(!currentLesson.is_completed)}
                    disabled={updateProgress.isPending}
                    className={`btn ${currentLesson.is_completed ? "btn-secondary" : "btn-primary"}`}
                  >
                    {updateProgress.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    {currentLesson.is_completed ? "Mark incomplete" : "Mark complete"}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-zinc-200/80 pt-5 dark:border-white/10">
              <button
                type="button"
                onClick={() => previousLesson && selectLesson(previousLesson)}
                disabled={!previousLesson}
                className="btn btn-secondary"
              >
                <ChevronLeft className="size-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => nextLesson && selectLesson(nextLesson)}
                disabled={!nextLesson}
                className="btn btn-secondary"
              >
                Next lesson
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          {/* Lesson sidebar */}
          <aside className="surface overflow-hidden lg:sticky lg:top-24">
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    {content.category}
                  </p>
                  <h2 className="mt-1 line-clamp-2 text-sm font-extrabold leading-snug">
                    {content.title}
                  </h2>
                </div>
                <span className="shrink-0 rounded-full bg-pink-50 px-2 py-1 text-[10px] font-bold text-ig-pink dark:bg-pink-500/10 dark:text-pink-300">
                  {Math.round(percent)}%
                </span>
              </div>
              <div className="mt-3">
                <ProgressBar value={percent} size="sm" />
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-400">
                  <span>
                    {completedCount} of {lessons.length} lessons complete
                  </span>
                  <span>{formatDuration(content.duration_hours)}</span>
                </div>
              </div>
            </div>

            <div className="scroll-area max-h-[calc(100vh-19rem)] overflow-y-auto border-t border-zinc-100 dark:border-white/10">
              {sections.map((section) => (
                <div key={section.section_id}>
                  <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-zinc-50/95 px-5 py-2.5 backdrop-blur dark:bg-zinc-800/95">
                    <h3 className="truncate text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {section.title}
                    </h3>
                    <span className="text-[10px] text-zinc-400">{section.lessons.length}</span>
                  </div>
                  <ul>
                    {section.lessons.map((lesson) => {
                      const isActive = lesson.lesson_id === currentLesson.lesson_id;
                      const isLocked = !content.has_access && !lesson.is_preview;
                      return (
                        <li key={lesson.lesson_id}>
                          <button
                            type="button"
                            onClick={() => selectLesson(lesson)}
                            className={`flex w-full items-start gap-2.5 px-4 py-3 text-left transition ${
                              isActive
                                ? "bg-pink-50/80 dark:bg-pink-500/10"
                                : "hover:bg-zinc-50 dark:hover:bg-white/5"
                            }`}
                            aria-current={isActive ? "true" : undefined}
                          >
                            <span
                              className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                lesson.is_completed
                                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                                  : isActive
                                    ? "ig-gradient text-white"
                                    : "bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-400"
                              }`}
                            >
                              {lesson.is_completed ? (
                                <Check className="size-3.5" />
                              ) : isLocked ? (
                                <Lock className="size-3" />
                              ) : (
                                <Play className="size-3 fill-current" />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className={`line-clamp-2 text-xs leading-5 ${
                                  isActive
                                    ? "font-bold text-ig-pink dark:text-pink-300"
                                    : "font-medium text-zinc-700 dark:text-zinc-300"
                                }`}
                              >
                                {lesson.title}
                              </span>
                              <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-zinc-400">
                                {formatLessonLength(lesson.duration_minutes)}
                                {lesson.is_preview && (
                                  <span className="rounded bg-emerald-50 px-1 font-bold uppercase text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                                    Preview
                                  </span>
                                )}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
