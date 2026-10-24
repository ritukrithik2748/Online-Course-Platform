import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative overflow-hidden py-20 sm:py-28">
      <div className="ig-gradient-soft pointer-events-none absolute inset-0 -z-10 opacity-80" />
      <div className="container-page relative text-center">
        <div className="mx-auto flex max-w-lg flex-col items-center">
          <span className="story-ring rounded-full p-[3px]">
            <span className="flex size-20 items-center justify-center rounded-full border-4 border-[#fbfafc] bg-white dark:border-zinc-950 dark:bg-zinc-900">
              <Compass className="size-8 text-ig-pink" />
            </span>
          </span>
          <p className="gradient-text mt-6 text-7xl font-black tracking-tighter sm:text-8xl">404</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            This page wandered off
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            The link may be old, or the page may have been moved. Your next lesson is still waiting.
          </p>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <Link to="/" className="btn btn-primary">
              <ArrowLeft className="size-4" />
              Back home
            </Link>
            <Link to="/courses" className="btn btn-secondary">
              Browse courses
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
