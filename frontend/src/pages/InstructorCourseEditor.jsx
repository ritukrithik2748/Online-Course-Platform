import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  CirclePlay,
  Eye,
  FileText,
  Layers,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { useCourse, useCategories } from "../hooks/useCatalog";
import { useCurriculum, useUpdateCourse } from "../hooks/useInstructor";
import { useToast } from "../context/ToastContext";
import CourseCover from "../components/course/CourseCover";
import Modal from "../components/ui/Modal";
import Field from "../components/ui/Field";
import { EmptyState, ErrorState } from "../components/ui/StateViews";
import { formatLessonLength, formatPrice, levelLabel, pluralize } from "../lib/format";
import { LEVEL_OPTIONS } from "../lib/courseVisuals";
import { validateCourse } from "../lib/validation";

const LESSON_ICONS = { video: Video, article: BookOpen, pdf: FileText };

export default function InstructorCourseEditor() {
  const { courseId } = useParams();
  const { success, error: toastError } = useToast();
  const courseQuery = useCourse(courseId);
  const categoriesQuery = useCategories();
  const updateCourse = useUpdateCourse(courseId);
  const curriculum = useCurriculum(courseId);

  const course = courseQuery.data;
  const sections = course?.sections || [];

  const [form, setForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    price: "0",
    level: "beginner",
    status: "draft",
    thumbnailUrl: "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  const [sectionModal, setSectionModal] = useState(null);
  const [sectionForm, setSectionForm] = useState({ title: "", order: 1 });
  const [sectionError, setSectionError] = useState("");

  const [lessonModal, setLessonModal] = useState(null);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    contentType: "video",
    contentUrl: "",
    duration: "10",
    order: 1,
    isPreview: false,
  });
  const [lessonError, setLessonError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (!course) return;
    setForm({
      title: course.title || "",
      description: course.description || "",
      categoryId: String(course.category?.category_id || ""),
      price: String(course.price ?? 0),
      level: course.level || "beginner",
      status: course.status || "draft",
      thumbnailUrl: course.thumbnail_url || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.course_id]);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
    if (formError) setFormError("");
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    setFormError("");
    const validation = validateCourse(form);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    try {
      await updateCourse.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || null,
        category_id: Number(form.categoryId),
        price: Number(form.price),
        level: form.level,
        status: form.status,
        thumbnail_url: form.thumbnailUrl.trim() || null,
      });
      success("Course updated", "Your changes are saved.");
    } catch (error) {
      setFormError(error.message);
    }
  };

  const togglePublished = async () => {
    const nextStatus = course.status === "published" ? "draft" : "published";
    try {
      await updateCourse.mutateAsync({ status: nextStatus });
      setForm((current) => ({ ...current, status: nextStatus }));
      success(
        nextStatus === "published" ? "Course published" : "Course unpublished",
        nextStatus === "published"
          ? "Students can find and enroll in it now."
          : "It is now a private draft."
      );
    } catch (error) {
      toastError("Could not change status", error.message);
    }
  };

  const openCreateSection = () => {
    setSectionForm({ title: "", order: sections.length + 1 });
    setSectionError("");
    setSectionModal({ mode: "create" });
  };

  const openEditSection = (section) => {
    setSectionForm({ title: section.title, order: section.section_order });
    setSectionError("");
    setSectionModal({ mode: "edit", section });
  };

  const submitSection = async (event) => {
    event.preventDefault();
    if (!sectionForm.title.trim()) {
      setSectionError("Give the section a title.");
      return;
    }
    if (Number(sectionForm.order) < 1) {
      setSectionError("Order must be 1 or more.");
      return;
    }
    try {
      if (sectionModal.mode === "create") {
        await curriculum.createSection.mutateAsync({
          title: sectionForm.title.trim(),
          section_order: Number(sectionForm.order),
        });
        success("Section added", "Now add the first lesson.");
      } else {
        await curriculum.updateSection.mutateAsync({
          sectionId: sectionModal.section.section_id,
          title: sectionForm.title.trim(),
          section_order: Number(sectionForm.order),
        });
        success("Section updated");
      }
      setSectionModal(null);
    } catch (error) {
      setSectionError(error.message);
    }
  };

  const openCreateLesson = (section) => {
    setLessonForm({
      title: "",
      contentType: "video",
      contentUrl: "",
      duration: "10",
      order: section.lessons.length + 1,
      isPreview: section.lessons.length === 0,
    });
    setLessonError("");
    setLessonModal({ mode: "create", section });
  };

  const openEditLesson = (section, lesson) => {
    setLessonForm({
      title: lesson.title,
      contentType: lesson.content_type,
      contentUrl: lesson.content_url || "",
      duration: String(lesson.duration_minutes ?? ""),
      order: lesson.lesson_order,
      isPreview: lesson.is_preview,
    });
    setLessonError("");
    setLessonModal({ mode: "edit", section, lesson });
  };

  const submitLesson = async (event) => {
    event.preventDefault();
    if (!lessonForm.title.trim()) {
      setLessonError("Give the lesson a title.");
      return;
    }
    if (Number(lessonForm.order) < 1) {
      setLessonError("Order must be 1 or more.");
      return;
    }
    if (lessonForm.duration !== "" && Number(lessonForm.duration) < 0) {
      setLessonError("Duration cannot be negative.");
      return;
    }
    const payload = {
      title: lessonForm.title.trim(),
      content_type: lessonForm.contentType,
      content_url: lessonForm.contentUrl.trim() || null,
      duration_minutes: lessonForm.duration === "" ? null : Number(lessonForm.duration),
      lesson_order: Number(lessonForm.order),
      is_preview: lessonForm.isPreview,
    };
    try {
      if (lessonModal.mode === "create") {
        await curriculum.createLesson.mutateAsync({
          sectionId: lessonModal.section.section_id,
          ...payload,
        });
        success("Lesson added", "The curriculum is coming together.");
      } else {
        await curriculum.updateLesson.mutateAsync({
          lessonId: lessonModal.lesson.lesson_id,
          ...payload,
        });
        success("Lesson updated");
      }
      setLessonModal(null);
    } catch (error) {
      setLessonError(error.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "section") {
        await curriculum.deleteSection.mutateAsync(deleteTarget.id);
        success("Section deleted");
      } else {
        await curriculum.deleteLesson.mutateAsync(deleteTarget.id);
        success("Lesson deleted");
      }
      setDeleteTarget(null);
    } catch (error) {
      toastError("Could not delete", error.message);
    }
  };

  if (courseQuery.isLoading) {
    return (
      <div className="container-page py-10">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton mt-4 h-10 w-2/3" />
        <div className="skeleton mt-8 h-96 w-full rounded-3xl" />
      </div>
    );
  }

  if (courseQuery.isError || !course) {
    return (
      <div className="container-page py-16">
        <ErrorState
          title="We could not open this course"
          description={
            courseQuery.error?.message || "It may have been deleted, or it is not your course."
          }
          onRetry={() => courseQuery.refetch()}
        />
        <div className="mt-6 text-center">
          <Link to="/instructor" className="btn btn-secondary">
            <ArrowLeft className="size-4" />
            Back to studio
          </Link>
        </div>
      </div>
    );
  }

  if (!course.is_owner) {
    return (
      <div className="container-page py-16">
        <ErrorState
          title="This is not your course"
          description="You can only edit courses that you created."
        />
        <div className="mt-6 text-center">
          <Link to="/instructor" className="btn btn-secondary">
            Back to studio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-zinc-200/70 bg-white/60 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="container-page py-6 sm:py-8">
          <Link
            to="/instructor"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 transition hover:text-ig-pink dark:text-zinc-400 dark:hover:text-pink-400"
          >
            <ArrowLeft className="size-4" />
            Instructor studio
          </Link>

          <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`badge ${
                    course.status === "published"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                  }`}
                >
                  {course.status}
                </span>
                <span className="text-[11px] font-semibold text-zinc-400">
                  {course.category?.name} · {levelLabel(course.level)}
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {course.title}
              </h1>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {course.student_count} {pluralize(course.student_count, "student")} ·{" "}
                {course.lesson_count} {pluralize(course.lesson_count, "lesson")} ·{" "}
                {formatPrice(course.price)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {course.status === "published" && (
                <Link
                  to={`/courses/${course.course_id}`}
                  className="btn btn-secondary"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Eye className="size-4" />
                  View
                </Link>
              )}
              <button
                type="button"
                onClick={togglePublished}
                disabled={updateCourse.isPending}
                className={course.status === "published" ? "btn btn-secondary" : "btn btn-primary"}
              >
                {updateCourse.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : course.status === "published" ? (
                  <Lock className="size-4" />
                ) : (
                  <CirclePlay className="size-4" />
                )}
                {course.status === "published" ? "Unpublish" : "Publish course"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Settings */}
        <form onSubmit={saveSettings} className="surface h-fit p-5 sm:p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-pink-50 text-ig-pink dark:bg-pink-500/10 dark:text-pink-300">
              <Pencil className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-extrabold">Course settings</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                The public face of your course.
              </p>
            </div>
          </div>

          {formError && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {formError}
            </div>
          )}

          <div className="mt-5 overflow-hidden rounded-2xl">
            <CourseCover
              category={course.category?.name}
              title={form.title}
              thumbnailUrl={form.thumbnailUrl}
              className="h-32"
            />
          </div>

          <div className="mt-4 space-y-4">
            <Field label="Title" htmlFor="editTitle" error={errors.title}>
              <input
                id="editTitle"
                className={`input ${errors.title ? "input-error" : ""}`}
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" htmlFor="editCategory" error={errors.categoryId}>
                <select
                  id="editCategory"
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
              <Field label="Level" htmlFor="editLevel">
                <select
                  id="editLevel"
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
              <Field label="Price (USD)" htmlFor="editPrice" error={errors.price}>
                <input
                  id="editPrice"
                  type="number"
                  min="0"
                  step="1"
                  className={`input ${errors.price ? "input-error" : ""}`}
                  value={form.price}
                  onChange={(event) => updateField("price", event.target.value)}
                />
              </Field>
              <Field label="Status" htmlFor="editStatus">
                <select
                  id="editStatus"
                  className="input"
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </Field>
            </div>

            <Field
              label="Thumbnail URL"
              htmlFor="editThumbnail"
              error={errors.thumbnailUrl}
              hint="Optional. A gradient cover is used when empty."
            >
              <input
                id="editThumbnail"
                className={`input ${errors.thumbnailUrl ? "input-error" : ""}`}
                value={form.thumbnailUrl}
                onChange={(event) => updateField("thumbnailUrl", event.target.value)}
                placeholder="https://…"
              />
            </Field>

            <Field label="Description" htmlFor="editDescription">
              <textarea
                id="editDescription"
                rows={6}
                className="input resize-y"
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
              />
            </Field>
          </div>

          <div className="mt-5 flex justify-end">
            <button type="submit" disabled={updateCourse.isPending} className="btn btn-primary">
              {updateCourse.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Save settings
            </button>
          </div>
        </form>

        {/* Curriculum */}
        <div className="surface h-fit p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-purple-50 text-ig-purple dark:bg-purple-500/10 dark:text-purple-300">
                <Layers className="size-4" />
              </span>
              <div>
                <h2 className="text-base font-extrabold">Curriculum</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {sections.length} {pluralize(sections.length, "section")} ·{" "}
                  {sections.reduce((total, section) => total + section.lessons.length, 0)}{" "}
                  {pluralize(
                    sections.reduce((total, section) => total + section.lessons.length, 0),
                    "lesson"
                  )}
                </p>
              </div>
            </div>
            <button type="button" onClick={openCreateSection} className="btn btn-secondary !py-2">
              <Plus className="size-4" />
              Section
            </button>
          </div>

          {sections.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon={Layers}
                title="No sections yet"
                description="Group your lessons into chapters. A good course usually has 2–5 sections."
                action={
                  <button type="button" onClick={openCreateSection} className="btn btn-primary">
                    <Plus className="size-4" />
                    Add the first section
                  </button>
                }
              />
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {sections.map((section) => (
                <div
                  key={section.section_id}
                  className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10"
                >
                  <div className="flex items-start justify-between gap-3 bg-zinc-50/80 p-3 dark:bg-white/[0.03]">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Section {section.section_order}
                      </p>
                      <h3 className="truncate text-sm font-extrabold">{section.title}</h3>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => openEditSection(section)}
                        className="icon-btn !size-8"
                        aria-label={`Edit section ${section.title}`}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({
                            type: "section",
                            id: section.section_id,
                            title: section.title,
                          })
                        }
                        className="icon-btn !size-8 hover:text-red-500"
                        aria-label={`Delete section ${section.title}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <ul className="divide-y divide-zinc-100 dark:divide-white/5">
                    {section.lessons.map((lesson) => {
                      const Icon = LESSON_ICONS[lesson.content_type] || Video;
                      return (
                        <li
                          key={lesson.lesson_id}
                          className="flex items-center gap-2.5 p-3"
                        >
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-300">
                            <Icon className="size-3.5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold">{lesson.title}</p>
                            <p className="text-[10px] text-zinc-400">
                              {formatLessonLength(lesson.duration_minutes)}
                              {lesson.is_preview ? " · Preview" : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openEditLesson(section, lesson)}
                            className="icon-btn !size-7"
                            aria-label={`Edit lesson ${lesson.title}`}
                          >
                            <Pencil className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                type: "lesson",
                                id: lesson.lesson_id,
                                title: lesson.title,
                              })
                            }
                            className="icon-btn !size-7 hover:text-red-500"
                            aria-label={`Delete lesson ${lesson.title}`}
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <button
                    type="button"
                    onClick={() => openCreateLesson(section)}
                    className="flex w-full items-center justify-center gap-1.5 border-t border-dashed border-zinc-200 py-2.5 text-[11px] font-bold text-zinc-500 transition hover:bg-pink-50/50 hover:text-ig-pink dark:border-white/10 dark:text-zinc-400 dark:hover:bg-pink-500/5"
                  >
                    <Plus className="size-3.5" />
                    Add lesson
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section modal */}
      <Modal
        open={Boolean(sectionModal)}
        onClose={() => setSectionModal(null)}
        title={sectionModal?.mode === "edit" ? "Edit section" : "Add a section"}
        size="sm"
      >
        <form onSubmit={submitSection} className="space-y-4">
          {sectionError && (
            <p className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle className="size-4 shrink-0" />
              {sectionError}
            </p>
          )}
          <Field label="Section title" htmlFor="sectionTitle">
            <input
              id="sectionTitle"
              className="input"
              value={sectionForm.title}
              onChange={(event) =>
                setSectionForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="e.g. Getting started"
              autoFocus
            />
          </Field>
          <Field label="Order" htmlFor="sectionOrder" hint="Lower numbers appear first.">
            <input
              id="sectionOrder"
              type="number"
              min="1"
              className="input"
              value={sectionForm.order}
              onChange={(event) =>
                setSectionForm((current) => ({ ...current, order: event.target.value }))
              }
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSectionModal(null)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={curriculum.createSection.isPending || curriculum.updateSection.isPending}
              className="btn btn-primary"
            >
              {(curriculum.createSection.isPending || curriculum.updateSection.isPending) && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {sectionModal?.mode === "edit" ? "Save section" : "Add section"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Lesson modal */}
      <Modal
        open={Boolean(lessonModal)}
        onClose={() => setLessonModal(null)}
        title={lessonModal?.mode === "edit" ? "Edit lesson" : "Add a lesson"}
        description={
          lessonModal?.section ? `Section: ${lessonModal.section.title}` : undefined
        }
        size="lg"
      >
        <form onSubmit={submitLesson} className="space-y-4">
          {lessonError && (
            <p className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle className="size-4 shrink-0" />
              {lessonError}
            </p>
          )}

          <Field label="Lesson title" htmlFor="lessonTitle">
            <input
              id="lessonTitle"
              className="input"
              value={lessonForm.title}
              onChange={(event) =>
                setLessonForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="e.g. Your first component"
              autoFocus
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Content type" htmlFor="lessonType">
              <select
                id="lessonType"
                className="input"
                value={lessonForm.contentType}
                onChange={(event) =>
                  setLessonForm((current) => ({ ...current, contentType: event.target.value }))
                }
              >
                <option value="video">Video</option>
                <option value="article">Article</option>
                <option value="pdf">PDF</option>
              </select>
            </Field>
            <Field label="Duration (min)" htmlFor="lessonDuration">
              <input
                id="lessonDuration"
                type="number"
                min="0"
                className="input"
                value={lessonForm.duration}
                onChange={(event) =>
                  setLessonForm((current) => ({ ...current, duration: event.target.value }))
                }
              />
            </Field>
            <Field label="Order" htmlFor="lessonOrder">
              <input
                id="lessonOrder"
                type="number"
                min="1"
                className="input"
                value={lessonForm.order}
                onChange={(event) =>
                  setLessonForm((current) => ({ ...current, order: event.target.value }))
                }
              />
            </Field>
          </div>

          <Field
            label="Content URL"
            htmlFor="lessonUrl"
            hint="MP4/WebM or a YouTube/Vimeo link for video, or the article/PDF URL."
          >
            <input
              id="lessonUrl"
              className="input"
              value={lessonForm.contentUrl}
              onChange={(event) =>
                setLessonForm((current) => ({ ...current, contentUrl: event.target.value }))
              }
              placeholder="https://…"
            />
          </Field>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl bg-zinc-50 p-3 text-xs dark:bg-white/5">
            <input
              type="checkbox"
              checked={lessonForm.isPreview}
              onChange={(event) =>
                setLessonForm((current) => ({ ...current, isPreview: event.target.checked }))
              }
              className="mt-0.5 size-4 accent-pink-600"
            />
            <span>
              <span className="block font-bold">Free preview lesson</span>
              <span className="text-zinc-500 dark:text-zinc-400">
                Anyone can watch this lesson before enrolling.
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setLessonModal(null)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={curriculum.createLesson.isPending || curriculum.updateLesson.isPending}
              className="btn btn-primary"
            >
              {(curriculum.createLesson.isPending || curriculum.updateLesson.isPending) && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {lessonModal?.mode === "edit" ? "Save lesson" : "Add lesson"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.type === "section" ? "section" : "lesson"}?`}
        description="This cannot be undone. Student progress for deleted lessons is removed."
        size="sm"
      >
        <p className="flex items-center gap-2 rounded-2xl bg-zinc-50 p-3 text-sm font-semibold dark:bg-white/5">
          <ChevronRight className="size-4 text-zinc-400" />
          {deleteTarget?.title}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setDeleteTarget(null)} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={curriculum.deleteSection.isPending || curriculum.deleteLesson.isPending}
            className="btn btn-danger"
          >
            {(curriculum.deleteSection.isPending || curriculum.deleteLesson.isPending) && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
