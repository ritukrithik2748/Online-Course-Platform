import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowDownWideNarrow,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useCategories, useCourses } from "../hooks/useCatalog";
import CourseCard, { CourseCardSkeleton } from "../components/course/CourseCard";
import { EmptyState, ErrorState } from "../components/ui/StateViews";
import Select from "../components/ui/Select";
import { LEVELS, PRICE_OPTIONS, RATING_OPTIONS, SORT_OPTIONS, getCategoryMeta } from "../lib/courseVisuals";

const PAGE_SIZE = 9;

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categories = useCategories();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const searchFromUrl = searchParams.get("search") || "";
  const categoryId = searchParams.get("category_id") || "";
  const level = searchParams.get("level") || "";
  const price = searchParams.get("price") || "";
  const minRating = searchParams.get("min_rating") || "";
  const sort = searchParams.get("sort") || "newest";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const [searchInput, setSearchInput] = useState(searchFromUrl);

  useEffect(() => {
    setSearchInput(searchFromUrl);
  }, [searchFromUrl]);

  const updateParams = (patch, { resetPage = true } = {}) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === "" || value === null || value === undefined) next.delete(key);
      else next.set(key, String(value));
    });
    if (resetPage && !("page" in patch)) next.delete("page");
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (searchInput === searchFromUrl) return undefined;
    const timer = window.setTimeout(() => {
      updateParams({ search: searchInput.trim() });
    }, 400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const queryParams = useMemo(
    () => ({
      search: searchFromUrl || undefined,
      category_id: categoryId || undefined,
      level: level || undefined,
      price: price || undefined,
      min_rating: minRating || undefined,
      sort,
      page,
      page_size: PAGE_SIZE,
    }),
    [searchFromUrl, categoryId, level, price, minRating, sort, page]
  );

  const courses = useCourses(queryParams);
  const activeCategory = categories.data?.find(
    (category) => String(category.category_id) === categoryId
  );

  const activeFilterCount = [categoryId, level, price, minRating, searchFromUrl].filter(Boolean)
    .length;

  const resetFilters = () => {
    setSearchInput("");
    setSearchParams({}, { replace: true });
  };

  const submitSearch = (event) => {
    event.preventDefault();
    updateParams({ search: searchInput.trim() });
  };

  const goToPage = (nextPage) => {
    updateParams({ page: nextPage }, { resetPage: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const data = courses.data;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72">
        <div className="ig-gradient-soft absolute inset-0 opacity-70" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#fbfafc] dark:to-zinc-950" />
      </div>

      <div className="container-page py-10 sm:py-14">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ig-pink">
            The catalog
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Find your next <span className="gradient-text">obsession</span>
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300 sm:text-base">
            Search by topic, filter by what fits your life, then start in minutes. Every course is
            built around small, finishable lessons.
          </p>
        </div>

        <form onSubmit={submitSearch} className="mt-7 flex max-w-2xl gap-2" role="search">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search courses, topics or instructors"
              aria-label="Search courses"
              className="input !rounded-full pl-11 pr-10"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-primary shrink-0">
            Search
          </button>
        </form>

        <div className="mt-10 grid items-start gap-7 lg:grid-cols-[240px_1fr]">
          {/* Filters */}
          <aside className="lg:sticky lg:top-24">
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className="btn btn-secondary w-full justify-between lg:hidden"
              aria-expanded={filtersOpen}
            >
              <span className="inline-flex items-center gap-2">
                <Filter className="size-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-ig-pink px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </span>
              <SlidersHorizontal className="size-4" />
            </button>

            <div
              className={`surface mt-3 space-y-5 p-5 lg:mt-0 lg:block ${
                filtersOpen ? "block" : "hidden"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold">Filters</h2>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-ig-pink hover:underline"
                  >
                    <RotateCcw className="size-3" />
                    Reset
                  </button>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Category
                </h3>
                <div className="flex flex-wrap gap-1.5 lg:flex-col lg:items-start">
                  <button
                    type="button"
                    onClick={() => updateParams({ category_id: "" })}
                    className={`chip ${!categoryId ? "chip-active" : ""}`}
                  >
                    All categories
                  </button>
                  {categories.data?.map((category) => {
                    const meta = getCategoryMeta(category.name);
                    const Icon = meta.icon;
                    return (
                      <button
                        key={category.category_id}
                        type="button"
                        onClick={() => updateParams({ category_id: category.category_id })}
                        className={`chip ${
                          categoryId === String(category.category_id) ? "chip-active" : ""
                        }`}
                      >
                        <Icon className="size-3.5" />
                        {category.name}
                        <span className="opacity-60">{category.course_count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="divider" />

              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Level
                </h3>
                <Select
                  value={level}
                  onChange={(value) => updateParams({ level: value })}
                  options={LEVELS}
                  ariaLabel="Filter by level"
                />
              </div>

              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Price
                </h3>
                <Select
                  value={price}
                  onChange={(value) => updateParams({ price: value })}
                  options={PRICE_OPTIONS}
                  ariaLabel="Filter by price"
                />
              </div>

              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Rating
                </h3>
                <Select
                  value={minRating}
                  onChange={(value) => updateParams({ min_rating: value })}
                  options={RATING_OPTIONS}
                  ariaLabel="Filter by rating"
                />
              </div>
            </div>
          </aside>

          {/* Results */}
          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold">
                  {activeCategory ? activeCategory.name : "All courses"}
                  {searchFromUrl && (
                    <span className="font-medium text-zinc-500 dark:text-zinc-400">
                      {" "}
                      for “{searchFromUrl}”
                    </span>
                  )}
                </h2>
                {!courses.isError && (
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {data
                      ? `${data.total} ${data.total === 1 ? "course" : "courses"} found`
                      : "Finding the good stuff…"}
                  </p>
                )}
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                <ArrowDownWideNarrow className="size-4" />
                <span className="sr-only sm:not-sr-only">Sort by</span>
                <select
                  value={sort}
                  onChange={(event) => updateParams({ sort: event.target.value })}
                  className="input !w-auto !rounded-full !py-2 !pl-3 !pr-7 text-xs font-semibold"
                  aria-label="Sort courses"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {activeFilterCount > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                {searchFromUrl && (
                  <FilterPill
                    label={`“${searchFromUrl}”`}
                    onRemove={() => {
                      setSearchInput("");
                      updateParams({ search: "" });
                    }}
                  />
                )}
                {activeCategory && (
                  <FilterPill
                    label={activeCategory.name}
                    onRemove={() => updateParams({ category_id: "" })}
                  />
                )}
                {level && (
                  <FilterPill
                    label={LEVELS.find((item) => item.value === level)?.label || level}
                    onRemove={() => updateParams({ level: "" })}
                  />
                )}
                {price && (
                  <FilterPill
                    label={PRICE_OPTIONS.find((item) => item.value === price)?.label || price}
                    onRemove={() => updateParams({ price: "" })}
                  />
                )}
                {minRating && (
                  <FilterPill
                    label={`${minRating}★ & up`}
                    onRemove={() => updateParams({ min_rating: "" })}
                  />
                )}
              </div>
            )}

            {courses.isLoading && (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <CourseCardSkeleton key={index} />
                ))}
              </div>
            )}

            {courses.isError && (
              <ErrorState
                title="The catalog did not load"
                description={courses.error?.message || "Please check your connection and try again."}
                onRetry={() => courses.refetch()}
              />
            )}

            {data && data.items.length === 0 && (
              <EmptyState
                icon={Sparkles}
                title="No courses match that yet"
                description="Try a broader search, clear a filter or explore everything we have."
                action={
                  <button type="button" onClick={resetFilters} className="btn btn-primary">
                    <RotateCcw className="size-4" />
                    Clear filters
                  </button>
                }
              />
            )}

            {data && data.items.length > 0 && (
              <>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {data.items.map((course) => (
                    <CourseCard key={course.course_id} course={course} />
                  ))}
                </div>

                {data.pages > 1 && (
                  <div className="mt-9 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={page <= 1}
                      onClick={() => goToPage(page - 1)}
                    >
                      <ChevronLeft className="size-4" />
                      Previous
                    </button>
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Page {data.page} of {data.pages}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={page >= data.pages}
                      onClick={() => goToPage(page + 1)}
                    >
                      Next
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="mt-10 flex flex-col items-center justify-between gap-3 rounded-3xl border border-dashed border-zinc-200 p-5 text-center dark:border-white/10 sm:flex-row sm:text-left">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Can’t find it? New courses land every week.
              </p>
              <Link to="/signup?role=instructor" className="btn btn-secondary">
                Teach a course
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterPill({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2.5 py-1 text-[11px] font-bold text-ig-pink dark:bg-pink-500/10 dark:text-pink-300">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 hover:bg-pink-100 dark:hover:bg-pink-500/20"
        aria-label={`Remove filter ${label}`}
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
