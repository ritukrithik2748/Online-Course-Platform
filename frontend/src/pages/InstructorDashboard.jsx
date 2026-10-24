import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  DollarSign,
  ExternalLink,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Star,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  useCreateCourse,
  useDeleteCourse,
  useInstructorCourses,
  useInstructorStats,
} from "../hooks/useInstructor";
import { useCategories } from "../hooks/useCatalog";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import CourseCover from "../components/course/CourseCover";
import Modal from "../components/ui/Modal";
import Field from "../components/ui/Field";
import { EmptyState, ErrorState } from "../components/ui/StateViews";
import { compactNumber, formatPrice, levelLabel, pluralize } from "../lib/format";
import { LEVEL_OPTIONS } from "../lib/courseVisuals";
import { validateCourse } from "../lib/validation";

const STATUS_STYLES = {
  published:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  draft: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  archived: "bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-400",
};

const EMPTY_FORM = {
  title: "",
  description: "",
  categoryId: "",
  price: "0",
  level: "beginner",
  status: "draft",
  thumbnailUrl: "",
};

export default function InstructorDashboard() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const coursesQuery = useInstructorCourses();
  const statsQuery = useInstructorStats();
  const categoriesQuery = useCategories();
  const createCourse = useCreateCourse();
  const deleteCourse = useDeleteCourse();

  const [filter, setFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (!form.categoryId && categoriesQuery.data?.length) {
      setForm((current) => ({
        ...current,
        categoryId: String(categoriesQuery.data[0].category_id),
      }));
    }
  }, [categoriesQuery.data, form.categoryId]);

  const courses = coursesQuery.data || [];
  const stats = statsQuery.data;
  const filtered = useMemo(
    () => (filter === "all" ? courses : courses.filter((course) => course.status === filter)),
    [courses, filter]
  );

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
    if (formError) setFormError("");
  };

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      categoryId: categoriesQuery.data?.[0]
        ? String(categoriesQuery.data[0].category_id)
        : "",
    });
    setErrors({});
    setFormError("");
    setCreateOpen(true);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    const validation = validateCourse(form);
    setErrors(validation);
    if (Object.keys(validation).length) return;

    try {
      const created = await createCourse.mutateAsync({
        category_id: Number(form.categoryId),
        title: form.title.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        level: form.level,
        thumbnail_url: form.thumbnailUrl.trim() || null,
        status: form.status,
      });
      success("Course created", "Add sections and lessons to bring it to life.");
      setCreateOpen(false);
      navigate(`/instructor/courses/${created.course_id}`);
    } catch (error) {
      setFormError(error.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCourse.mutateAsync(deleteTarget.course_id);
      success("Course deleted", `“${deleteTarget.title}” has been removed.`);
      setDeleteTarget(null);
    } catch (error) {
      toastError("Could not delete course", error.message);
    }
  };

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72">
        <div className="ig-gradient-soft absolute inset-0 opacity-70" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[#fbfafc] dark:to-zinc-950" />
      </div>

      <div className="container-page py-10 sm:py-14">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ig-pink">
              Instructor studio
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Teach something that sticks, {user?.first_name}.
            </h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
              Build a course, shape the curriculum and watch students make progress lesson by
              lesson.
            </p>
          </div>
          <button type="button" onClick={openCreate} className="btn btn-primary w-fit">
            <Plus className="size-4" />
            New course
          </button>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(statsQuery.isLoading
            ? [
                { icon: BookOpen, label: "Courses", value: "—" },
                { icon: Users, label: "Students", value: "—" },
                { icon: Star, label: "Rating", value: "—" },
                { icon: TrendingUp, label: "Reviews", value: "—" },
              ]
            : [
                { icon: BookOpen, label: "Courses", value: stats?.courses ?? 0 },
                { icon: Users, label: "Students", value: compactNumber(stats?.students ?? 0) },
                {
                  icon: Star,
                  label: "Average rating",
                  value: Number(stats?.rating || 0).toFixed(1),
                },
                { icon: TrendingUp, label: "Reviews", value: stats?.reviews ?? 0 },
              ]
          ).map((item) => (
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

        {statsQuery.isError && (
          <p className="mt-3 text-xs text-red-500">
            Could not load studio stats: {statsQuery.error?.message}
          </p>
        )}

        {/* Courses */}
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Your courses</h2>
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: "all", label: "All" },
                { value: "published", label: "Published" },
                { value: "draft", label: "Drafts" },
                { value: "archived", label: "Archived" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`chip ${filter === option.value ? "chip-active" : ""}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {coursesQuery.isLoading && (
            <div className="mt-5 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="surface flex gap-4 p-4">
                  <div className="skeleton h-24 w-40 rounded-2xl" />
                  <div className="flex-1 space-y-3 py-2">
                    <div className="skeleton h-3 w-24" />
                    <div className="skeleton h-5 w-2/3" />
                    <div className="skeleton h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {coursesQuery.isError && (
            <div className="mt-5">
              <ErrorState
                title="Your courses did not load"
                description={coursesQuery.error?.message || "Please try again."}
                onRetry={() => coursesQuery.refetch()}
              />
            </div>
          )}

          {!coursesQuery.isLoading && !coursesQuery.isError && courses.length === 0 && (
            <div className="mt-5">
              <EmptyState
                icon={GraduationCap}
                title="Your first course starts here"
                description="Create a draft, add a few sections and lessons, then publish when it feels right."
                action={
                  <button type="button" onClick={openCreate} className="btn btn-primary">
                    <Plus className="size-4" />
                    Create a course
                  </button>
                }
              />
            </div>
          )}

          {!coursesQuery.isLoading && !coursesQuery.isError && courses.length > 0 && filtered.length === 0 && (
            <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
              No {filter} courses yet.
            </p>
          )}

          {filtered.length > 0 && (
            <div className="mt-5 space-y-3">
              {filtered.map((course) => (
                <div
                  key={course.course_id}
                  className="surface flex flex-col gap-4 p-4 transition hover:border-pink-200 dark:hover:border-pink-500/30 sm:flex-row sm:items-center"
                >
                  <div className="w-full shrink-0 sm:w-40">
                    <CourseCover
                      category={course.category}
                      title={course.title}
                      thumbnailUrl={course.thumbnail_url}
                      className="h-28 rounded-2xl sm:h-24"
                      compact
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`badge ${
                          STATUS_STYLES[course.status] || STATUS_STYLES.draft
                        }`}
                      >
                        {course.status}
                      </span>
                      <span className="text-[11px] font-semibold text-zinc-400">
                        {course.category} · {levelLabel(course.level)}
                      </span>
                    </div>
                    <h3 className="mt-1.5 line-clamp-1 text-base font-extrabold">{course.title}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" /> {compactNumber(course.student_count)} students
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Star className="size-3.5" />
                        {Number(course.rating || 0).toFixed(1)} ({course.review_count})
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="size-3.5" /> {course.lesson_count}{" "}
                        {pluralize(course.lesson_count, "lesson")}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <DollarSign className="size-3.5" /> {formatPrice(course.price)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link
                      to={`/courses/${course.course_id}`}
                      className="btn btn-ghost !px-3 !py-2 text-xs"
                      title="View public page"
                    >
                      <ExternalLink className="size-3.5" />
                      View
                    </Link>
                    <Link
                      to={`/instructor/courses/${course.course_id}`}
                      className="btn btn-secondary !px-3 !py-2 text-xs"
                    >
                      <Pencil className="size-3.5" />
                      Manage
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(course)}
                      className="btn btn-danger !px-3 !py-2 text-xs"
                      aria-label={`Delete ${course.title}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="surface flex items-start gap-3 p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-ig-purple dark:bg-purple-500/10 dark:text-purple-300">
              <BarChart3 className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold">Publish when it is ready</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                Drafts stay private to you. Published courses appear in the catalog instantly.
              </p>
            </div>
          </div>
          <div className="surface flex items-start gap-3 p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-pink-50 text-ig-pink dark:bg-pink-500/10 dark:text-pink-300">
              <Users className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold">Students see progress, not pressure</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                Lesson completion feeds each student&apos;s dashboard automatically.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create course */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create a course"
        description="Start with the essentials. You can change everything later."
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4" noValidate>
          {formError && (
            <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {formError}
            </div>
          )}

          <Field label="Course title" htmlFor="courseTitle" error={errors.title}>
            <input
              id="courseTitle"
              className={`input ${errors.title ? "input-error" : ""}`}
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="e.g. Design systems that survive real teams"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="courseCategory" error={errors.categoryId}>
              <select
                id="courseCategory"
                className={`input ${errors.categoryId ? "input-error" : ""}`}
                value={form.categoryId}
                onChange={(event) => updateField("categoryId", event.target.value)}
              >
                <option value="">Choose a category</option>
                {categoriesQuery.data?.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Level" htmlFor="courseLevel">
              <select
                id="courseLevel"
                className="input"
                value={form.level}
                onChange={(event) => updateField("level", event.target.value)}
              >
                {LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price (USD)" htmlFor="coursePrice" error={errors.price} hint="Use 0 for free.">
              <input
                id="coursePrice"
                type="number"
                min="0"
                step="1"
                className={`input ${errors.price ? "input-error" : ""}`}
                value={form.price}
                onChange={(event) => updateField("price", event.target.value)}
              />
            </Field>
            <Field label="Status" htmlFor="courseStatus">
              <select
                id="courseStatus"
                className="input"
                value={form.status}
                onChange={(event) => updateField("status", event.target.value)}
              >
                <option value="draft">Draft — only you can see it</option>
                <option value="published">Published — live in the catalog</option>
              </select>
            </Field>
          </div>

          <Field label="Thumbnail URL" htmlFor="courseThumbnail" error={errors.thumbnailUrl} hint="Optional. Leave empty for a gradient cover.">
            <input
              id="courseThumbnail"
              className={`input ${errors.thumbnailUrl ? "input-error" : ""}`}
              value={form.thumbnailUrl}
              onChange={(event) => updateField("thumbnailUrl", event.target.value)}
              placeholder="https://…"
            />
          </Field>

          <Field label="Description" htmlFor="courseDescription">
            <textarea
              id="courseDescription"
              rows={5}
              className="input resize-y"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="What will students be able to do by the end?"
            />
          </Field>

          <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={createCourse.isPending} className="btn btn-primary">
              {createCourse.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Create course
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete this course?"
        description="This removes the course and its lessons permanently. Courses with existing orders cannot be deleted."
        size="sm"
      >
        <p className="rounded-2xl bg-zinc-50 p-3 text-sm font-semibold dark:bg-white/5">
          {deleteTarget?.title}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setDeleteTarget(null)} className="btn btn-secondary">
            Keep course
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteCourse.isPending}
            className="btn btn-danger"
          >
            {deleteCourse.isPending && <Loader2 className="size-4 animate-spin" />}
            Delete permanently
          </button>
        </div>
      </Modal>
    </div>
  );
}
