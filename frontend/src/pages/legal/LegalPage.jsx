import { Link } from "react-router-dom";

export default function LegalPage({ eyebrow, title, updated, intro, sections }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64">
        <div className="ig-gradient-soft absolute inset-0 opacity-70" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#fbfafc] dark:to-zinc-950" />
      </div>

      <div className="container-page max-w-3xl py-10 sm:py-14">
        <nav className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-ig-pink">
            Home
          </Link>
          <span>/</span>
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">{title}</span>
        </nav>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-ig-pink">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Last updated: {updated}</p>

        <div className="surface mt-8 p-6 sm:p-8">
          <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300">{intro}</p>

          {sections.map((section, index) => (
            <section key={section.heading} className="mt-7">
              <h2 className="text-lg font-extrabold tracking-tight">
                {index + 1}. {section.heading}
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          Questions? Reach us at{" "}
          <a href="mailto:support@learnova.app" className="font-bold text-ig-pink hover:underline">
            support@learnova.app
          </a>
          .
        </p>
      </div>
    </div>
  );
}
