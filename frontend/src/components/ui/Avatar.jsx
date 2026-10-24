import { useState } from "react";
import { initials } from "../../lib/format";

const PALETTES = [
  ["#fa7e1e", "#d62976"],
  ["#d62976", "#962fbf"],
  ["#4f5bd5", "#962fbf"],
  ["#0ea5e9", "#4f5bd5"],
  ["#f59e0b", "#d62976"],
  ["#10b981", "#0ea5e9"],
];

const SIZES = {
  xs: "size-7 text-[10px]",
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-16 text-lg",
  xl: "size-24 text-2xl",
};

function paletteFor(name = "") {
  const seed = name.split("").reduce((total, letter) => total + letter.charCodeAt(0), 0);
  return PALETTES[seed % PALETTES.length];
}

export default function Avatar({ name = "", src, size = "md", ring = false, className = "" }) {
  const [failed, setFailed] = useState(false);
  const [from, to] = paletteFor(name);
  const showImage = src && !failed;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white ${
        SIZES[size] || SIZES.md
      } ${ring ? "ring-2 ring-white ring-offset-2 ring-offset-pink-500 dark:ring-offset-zinc-900" : ""} ${className}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
      aria-hidden={!name}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initials(name) || "?"}</span>
      )}
    </span>
  );
}
