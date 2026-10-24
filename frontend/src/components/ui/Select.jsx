import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

/**
 * A dark-themed custom dropdown.
 *
 * Native <select> popups render with the OS menu (white, unstyleable) which
 * clashes with the dark UI. This renders a styled listbox instead.
 *
 * Props:
 *   value    - currently selected option value (string)
 *   onChange - (value: string) => void
 *   options  - [{ value, label }]
 *   ariaLabel
 *   className - extra classes for the trigger button
 */
export default function Select({ value, onChange, options = [], ariaLabel, className = "" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-100 dark:hover:border-white/20"
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-zinc-400 transition-transform duration-200 dark:text-zinc-500 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="animate-pop absolute left-0 right-0 z-30 mt-2 max-h-64 overflow-auto rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-[var(--shadow-soft)] dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/40"
        >
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSelect(option.value)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                    isActive
                      ? "bg-gradient-to-r from-pink-500/15 to-purple-500/15 font-bold text-ig-pink dark:text-pink-300"
                      : "font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isActive && <Check className="size-4 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
