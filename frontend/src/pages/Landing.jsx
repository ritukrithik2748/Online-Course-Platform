import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Play,
  Quote,
  Search,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { useCategories, useCourses } from "../hooks/useCatalog";
import CourseCard, { CourseCardSkeleton } from "../components/course/CourseCard";
import CourseCover from "../components/course/CourseCover";
import Avatar from "../components/ui/Avatar";
import { EmptyState, ErrorState } from "../components/ui/StateViews";
import { FEATURES, LEARNER_STATS, TESTIMONIALS, getCategoryMeta } from "../lib/courseVisuals";
import { formatDuration, formatPrice } from "../lib/format";

const TRENDING = ["React", "Design", "SQL", "Marketing"];

export default function Landing() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const featured = useCourses({ sort: "popular", page_size: 6 });
  const categories = useCategories();
  const heroCourses = featured.data?.items?.slice(0, 3) || [];

  const submitSearch = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/courses?search=${encodeURIComponent(trimmed)}` : "/courses");
  };

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="ig-gradient-soft absolute inset-0 opacity-80" />
          <div className="absolute -left-24 top-10 size-72 rounded-full bg-pink-500/20 blur-3xl" />
          <div className="absolute -right-16 top-0 size-96 rounded-full bg-purple-600/20 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[color:var(--instagram-gradient)] dark:to-zinc-950" />
        </div>

        <div className="container-page grid items-center gap-12 pb-16 pt-12 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-20">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-pink-200/80 bg-white/80 px-3.5 py-1.5 text-xs font-bold text-ig-pink shadow-sm backdrop-blur dark:border-pink-500/30 dark:bg-white/5 dark:text-pink-300">
              <Sparkles className="size-3.5" />
              The social way to learn
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Learn something{" "}
              <br className="hidden sm:block" />
              <span className="gradient-text">worth sharing.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-300 sm:text-lg">
              Short, practical courses from instructors who do the work. Pick a story-sized lesson,
              make progress, and build something you are proud to show.
            </p>

            <form
              onSubmit={submitSearch}
              className="mt-7 flex w-full max-w-xl items-center gap-2 rounded-full border border-zinc-200 bg-white p-1.5 shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-zinc-900"
              role="search"
            >
              <Search className="ml-3 size-5 shrink-0 text-zinc-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="What do you want to learn today?"
                aria-label="Search courses"
                className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-white"
              />
              <button type="submit" className="btn btn-primary shrink-0">
                Explore
                <ArrowRight className="size-4" />
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold">Trending:</span>
              {TRENDING.map((term) => (
                <Link
                  key={term}
                  to={`/courses?search=${encodeURIComponent(term)}`}
                  className="rounded-full border border-zinc-200 bg-white/70 px-2.5 py-1 font-medium transition hover:border-pink-300 hover:text-ig-pink dark:border-white/10 dark:bg-white/5 dark:hover:border-pink-500/40 dark:hover:text-pink-300"
                >
                  {term}
                </Link>
              ))}
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {["Maya Chen", "Andre Silva", "Priya Nair", "Sam Rivera"].map((name) => (
                    <Avatar key={name} name={name} size="sm" className="ring-2 ring-white dark:ring-zinc-950" />
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="size-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Loved by 12,000+ learners
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <CheckCircle2 className="size-4 text-emerald-500" />
                New courses every week
              </div>
            </div>
          </div>

          {/* Hero collage */}
          <div className="relative hidden h-[430px] animate-fade-up animation-delay-200 lg:block">
            <div className="absolute left-6 top-2 size-64 rounded-[3rem] bg-gradient-to-br from-pink-400/30 to-purple-500/30 blur-2xl" />
            {heroCourses[0] && (
              <div className="absolute left-4 top-10 w-64 rotate-[-4deg] rounded-3xl border border-white/60 bg-white p-3 shadow-[var(--shadow-soft)] transition duration-500 hover:rotate-0 hover:scale-[1.02] dark:border-white/10 dark:bg-zinc-900">
                <CourseCover
                  category={heroCourses[0].category}
                  title={heroCourses[0].title}
                  thumbnailUrl={heroCourses[0].thumbnail_url}
                  className="h-28 rounded-2xl"
                  compact
                  loading="eager"
                />
                <p className="mt-3 line-clamp-2 text-sm font-extrabold leading-snug">
                  {heroCourses[0].title}
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span>{heroCourses[0].instructor}</span>
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {formatPrice(heroCourses[0].price)}
                  </span>
                </div>
              </div>
            )}

            {heroCourses[1] && (
              <div className="absolute right-0 top-0 w-60 rotate-[5deg] rounded-3xl border border-white/60 bg-white p-3 shadow-[var(--shadow-soft)] transition duration-500 hover:rotate-0 hover:scale-[1.02] dark:border-white/10 dark:bg-zinc-900">
                <div className="relative h-28 overflow-hidden rounded-2xl">
                  <CourseCover
                    category={heroCourses[1].category}
                    title={heroCourses[1].title}
                    thumbnailUrl={heroCourses[1].thumbnail_url}
                    className="h-28"
                    compact
                    loading="eager"
                  />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex size-10 items-center justify-center rounded-full bg-white/90 shadow-lg">
                      <Play className="ml-0.5 size-4 fill-zinc-900 text-zinc-900" />
                    </span>
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm font-extrabold leading-snug">
                  {heroCourses[1].title}
                </p>
                <div className="mt-2 flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  {Number(heroCourses[1].rating || 0).toFixed(1)}
                  <span>·</span>
                  {formatDuration(heroCourses[1].duration_hours)}
                </div>
              </div>
            )}

            {heroCourses[2] && (
              <div className="absolute bottom-2 left-20 w-64 rotate-[2deg] rounded-3xl border border-white/60 bg-white p-4 shadow-[var(--shadow-soft)] transition duration-500 hover:rotate-0 hover:scale-[1.02] dark:border-white/10 dark:bg-zinc-900">
                <div className="flex items-center gap-3">
                  <Avatar name={heroCourses[2].instructor} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold">{heroCourses[2].instructor}</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Instructor</p>
                  </div>
                  <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    LIVE
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
                  <div className="ig-gradient h-full w-[68%] rounded-full" />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span>Lesson 4 of 6</span>
                  <span className="font-bold text-zinc-900 dark:text-white">68%</span>
                </div>
              </div>
            )}

            <div className="absolute bottom-16 right-2 flex items-center gap-2 rounded-2xl border border-white/60 bg-white/90 px-3 py-2 shadow-[var(--shadow-card)] backdrop-blur dark:border-white/10 dark:bg-zinc-900/90">
              <span className="flex size-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
                <Star className="size-4 fill-amber-500 text-amber-500" />
              </span>
              <div>
                <p className="text-xs font-extrabold">4.8 average</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">across all courses</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container-page pb-12">
          <div className="grid grid-cols-3 divide-x divide-zinc-200/80 rounded-3xl border border-zinc-200/70 bg-white/70 py-5 backdrop-blur dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.03]">
            {LEARNER_STATS.map((stat) => (
              <div key={stat.label} className="px-2 text-center sm:px-4">
                <p className="gradient-text text-2xl font-extrabold sm:text-3xl">{stat.value}</p>
                <p className="mt-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 sm:text-xs">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories as stories */}
      <section id="categories" className="container-page scroll-mt-24 py-10 sm:py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ig-pink">Browse by mood</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Pick a category, start a story
            </h2>
          </div>
          <Link
            to="/courses"
            className="hidden items-center gap-1 text-sm font-bold text-zinc-600 transition hover:text-ig-pink dark:text-zinc-300 dark:hover:text-pink-400 sm:flex"
          >
            See all courses <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="no-scrollbar mt-7 flex gap-5 overflow-x-auto pb-2 sm:gap-7">
          {categories.isLoading &&
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex w-20 shrink-0 flex-col items-center gap-2">
                <div className="skeleton size-[72px] rounded-full" />
                <div className="skeleton h-2.5 w-14" />
              </div>
            ))}

          {categories.isError && (
            <p className="text-sm text-zinc-500">
              Categories are taking a break. You can still{" "}
              <Link to="/courses" className="font-bold text-ig-pink">
                browse all courses
              </Link>
              .
            </p>
          )}

          {categories.data?.map((category) => {
            const meta = getCategoryMeta(category.name);
            const Icon = meta.icon;
            return (
              <Link
                key={category.category_id}
                to={`/courses?category_id=${category.category_id}`}
                className="group flex w-20 shrink-0 flex-col items-center gap-2 text-center sm:w-24"
              >
                <span className="story-ring rounded-full p-[3px] transition duration-300 group-hover:scale-105 group-hover:shadow-glow">
                  <span className="flex size-[68px] items-center justify-center rounded-full border-[3px] border-[#fbfafc] bg-white dark:border-zinc-950 dark:bg-zinc-900 sm:size-20">
                    <span
                      className="flex size-12 items-center justify-center rounded-full text-white sm:size-14"
                      style={{
                        backgroundImage: `linear-gradient(135deg, ${meta.gradient[0]}, ${meta.gradient[1]})`,
                      }}
                    >
                      <Icon className="size-6" />
                    </span>
                  </span>
                </span>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {category.name}
                </span>
                <span className="-mt-1.5 text-[10px] text-zinc-400">
                  {category.course_count} {category.course_count === 1 ? "course" : "courses"}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured courses */}
      <section className="container-page py-8 sm:py-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ig-pink">
              Featured this week
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Courses people are finishing
            </h2>
          </div>
          <Link to="/courses" className="btn btn-secondary hidden sm:inline-flex">
            View all
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-7">
          {featured.isLoading && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <CourseCardSkeleton key={index} />
              ))}
            </div>
          )}
          {featured.isError && (
            <ErrorState
              title="We could not load the featured courses"
              description="Check that the gateway and backend are running, then try again."
              onRetry={() => featured.refetch()}
            />
          )}
          {featured.data && featured.data.items.length === 0 && (
            <EmptyState
              icon={Sparkles}
              title="No courses published yet"
              description="Once an instructor publishes a course, the best ones will show up here."
              action={
                <Link to="/courses" className="btn btn-primary">
                  Browse the catalog
                </Link>
              }
            />
          )}
          {featured.data && featured.data.items.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.data.items.map((course) => (
                <CourseCard key={course.course_id} course={course} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why */}
      <section className="container-page py-12 sm:py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              className="surface card-hover relative overflow-hidden p-6"
            >
              <span className="ig-gradient absolute -right-6 -top-6 flex size-20 items-center justify-center rounded-full text-2xl font-black text-white/40">
                0{index + 1}
              </span>
              <span className="flex size-11 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                {index === 0 ? (
                  <Clock className="size-5" />
                ) : index === 1 ? (
                  <Users className="size-5" />
                ) : (
                  <CheckCircle2 className="size-5" />
                )}
              </span>
              <h3 className="mt-4 text-lg font-extrabold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="scroll-mt-24 bg-white/60 py-14 dark:bg-white/[0.02] sm:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ig-pink">
              Real people, real progress
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              The kind of reviews we screenshot
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((testimonial) => (
              <figure
                key={testimonial.name}
                className="surface flex flex-col p-6 transition duration-300 hover:-translate-y-1"
              >
                <Quote className="size-7 text-ig-pink/40" />
                <blockquote className="mt-3 flex-1 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  “{testimonial.quote}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-zinc-100 pt-4 dark:border-white/10">
                  <span
                    className="flex size-10 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${testimonial.colors[0]}, ${testimonial.colors[1]})`,
                    }}
                  >
                    {testimonial.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </span>
                  <div>
                    <p className="text-sm font-bold">{testimonial.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{testimonial.role}</p>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="size-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-14 sm:py-20">
        <div className="relative overflow-hidden rounded-[2rem] px-6 py-12 text-center text-white sm:px-12 sm:py-16">
          <div className="ig-gradient absolute inset-0" />
          <div className="cover-pattern absolute inset-0 opacity-40" />
          <div className="absolute -left-16 -top-16 size-64 rounded-full bg-white/10" />
          <div className="absolute -bottom-24 -right-10 size-72 rounded-full bg-white/10" />

          <div className="relative mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
              <Sparkles className="size-3.5" /> Your next chapter
            </span>
            <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Five minutes from now, you could be learning.
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/85 sm:text-base">
              Join a community of curious people. Free courses, clear progress and instructors who
              answer.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="btn bg-white text-zinc-900 shadow-lg hover:-translate-y-0.5 hover:bg-zinc-50"
              >
                Start learning free
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/courses"
                className="btn border border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20"
              >
                Browse courses
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
