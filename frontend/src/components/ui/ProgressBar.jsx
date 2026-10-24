export default function ProgressBar({ value = 0, className = "", size = "md" }) {
  const percent = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10 ${
        size === "sm" ? "h-1.5" : "h-2"
      } ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="ig-gradient h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
