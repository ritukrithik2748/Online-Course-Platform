import {
  BarChart3,
  Briefcase,
  Camera,
  Code2,
  GraduationCap,
  Megaphone,
  Palette,
} from "lucide-react";

const FALLBACK = {
  icon: GraduationCap,
  gradient: ["#d62976", "#962fbf"],
  tagline: "A new skill, one lesson at a time.",
};

export const CATEGORY_META = {
  Development: {
    icon: Code2,
    gradient: ["#4f5bd5", "#962fbf"],
    tagline: "Ship better software.",
  },
  Design: {
    icon: Palette,
    gradient: ["#d62976", "#fa7e1e"],
    tagline: "Make interfaces feel effortless.",
  },
  "Data Science": {
    icon: BarChart3,
    gradient: ["#0ea5e9", "#4f5bd5"],
    tagline: "Find the story in the numbers.",
  },
  Business: {
    icon: Briefcase,
    gradient: ["#f59e0b", "#d62976"],
    tagline: "Build things people want.",
  },
  Marketing: {
    icon: Megaphone,
    gradient: ["#fa7e1e", "#d62976"],
    tagline: "Grow an audience that cares.",
  },
  Photography: {
    icon: Camera,
    gradient: ["#10b981", "#0ea5e9"],
    tagline: "See light differently.",
  },
};

export function getCategoryMeta(name) {
  return CATEGORY_META[name] || FALLBACK;
}

export function coverStyle(name) {
  const [from, to] = getCategoryMeta(name).gradient;
  return { backgroundImage: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` };
}

export const LEVELS = [
  { value: "", label: "All levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export const LEVEL_OPTIONS = LEVELS.slice(1);

export const PRICE_OPTIONS = [
  { value: "", label: "Any price" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
];

export const RATING_OPTIONS = [
  { value: "", label: "Any rating" },
  { value: "4.5", label: "4.5 & up" },
  { value: "4", label: "4.0 & up" },
  { value: "3.5", label: "3.5 & up" },
];

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most popular" },
  { value: "rating", label: "Highest rated" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export const TESTIMONIALS = [
  {
    name: "Aisha Rahman",
    role: "Frontend engineer",
    quote:
      "I finished the React course on a Sunday and shipped a new dashboard by Friday. The lessons are short, specific and actually stick.",
    colors: ["#d62976", "#962fbf"],
  },
  {
    name: "Marcus Lee",
    role: "Product designer",
    quote:
      "The design foundations course gave me the vocabulary to defend my decisions. My reviews are shorter and my work is better.",
    colors: ["#fa7e1e", "#d62976"],
  },
  {
    name: "Sofia Alvarez",
    role: "Data analyst",
    quote:
      "LearNova feels like Instagram but for learning. I open it for five minutes and leave with something I can use.",
    colors: ["#4f5bd5", "#0ea5e9"],
  },
];

export const FEATURES = [
  {
    title: "Learn in small loops",
    description:
      "Bite-sized lessons, clear progress and a continue button that always knows where you left off.",
  },
  {
    title: "Taught by practitioners",
    description:
      "Instructors who still do the work, sharing the patterns and shortcuts they use on real projects.",
  },
  {
    title: "Proof you finished",
    description:
      "Track completion lesson by lesson, keep your streak and walk away with something to show for it.",
  },
];

export const LEARNER_STATS = [
  { value: "12k+", label: "curious learners" },
  { value: "80+", label: "hands-on courses" },
  { value: "4.8", label: "average rating" },
];
