import { AlertCircle, Loader2, RefreshCw, Sparkles } from "lucide-react";

export function PageLoader({ label = "Loading…" }) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4" role="status">
      <span className="relative flex size-12 items-center justify-center rounded-2xl">
        <span className="ig-gradient absolute inset-0 rounded-2xl opacity-90" />
        <Loader2 className="relative size-6 animate-spin text-white" />
      </span>
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}

export function InlineLoader({ label = "Loading…" }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </span>
  );
}

export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  action,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-white/60 px-6 py-14 text-center dark:border-white/10 dark:bg-white/[0.02] ${className}`}
    >
      <span className="ig-gradient-soft mb-4 flex size-14 items-center justify-center rounded-2xl">
        <Icon className="size-6 text-ig-pink dark:text-pink-300" />
      </span>
      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "That didn’t load",
  description = "Something went wrong while fetching this content.",
  onRetry,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-3xl border border-red-100 bg-red-50/60 px-6 py-14 text-center dark:border-red-500/20 dark:bg-red-500/5 ${className}`}
      role="alert"
    >
      <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-500/15">
        <AlertCircle className="size-6 text-red-500 dark:text-red-400" />
      </span>
      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        {description}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-secondary mt-5">
          <RefreshCw className="size-4" />
          Try again
        </button>
      )}
    </div>
  );
}
