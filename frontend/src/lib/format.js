export function formatPrice(price, currency = "INR") {
  const value = Number(price) || 0;
  if (value === 0) return "Free";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatDuration(hours) {
  const value = Number(hours) || 0;
  if (value <= 0) return "Self-paced";
  const totalMinutes = Math.round(value * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h} hr${h === 1 ? "" : "s"}`;
  return `${h}h ${m}m`;
}

export function formatLessonLength(minutes) {
  const value = Number(minutes) || 0;
  if (!value) return "—";
  return `${value} min`;
}

export function compactNumber(value) {
  const number = Number(value) || 0;
  return new Intl.NumberFormat("en-US", {
    notation: number >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(number);
}

export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function levelLabel(level) {
  if (!level) return "All levels";
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export function progressLabel(value) {
  const number = Number(value) || 0;
  return `${Math.min(100, Math.max(0, Math.round(number)))}%`;
}

export function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural || `${singular}s`;
}
