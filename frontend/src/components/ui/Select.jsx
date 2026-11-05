import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

/**
 * A dark-themed custom dropdown.
 *
 * Native <select> popups render with the OS menu (white, unstyleable) which
 * clashes with the dark UI. This renders a styled listbox instead.
 *
 * Props:
 *   value     - currently selected option value (string)
 *   onChange  - (value: string) => void
 *   options   - [{ value, label }]
 *   ariaLabel
 *   id, name  - form attributes for the trigger button
 *   className - extra classes for the wrapper
 */
export default function Select({
  value,
  onChange,
  options = [],
  ariaLabel,
  id,
  name,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const generatedId = useId();
  const listId = `${id || generatedId}-listbox`;
  const optionId = (index) => `${listId}-option-${index}`;

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = options[selectedIndex >= 0 ? selectedIndex : 0] || options[0];

  const close = (focusTrigger = false) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const openList = (index) => {
    setActiveIndex(Math.min(Math.max(index, 0), options.length - 1));
    setOpen(true);
  };

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    close(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const node = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const handleKeyDown = (event) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) openList(selectedIndex >= 0 ? selectedIndex : 0);
        else setActiveIndex((index) => Math.min(index + 1, options.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) openList(selectedIndex >= 0 ? selectedIndex : 0);
        else setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Home":
        if (!open) return;
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        if (!open) return;
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
        event.preventDefault();
        if (open) handleSelect(options[activeIndex]?.value);
        else openList(selectedIndex >= 0 ? selectedIndex : 0);
        break;
      case " ":
        if (open) {
          event.preventDefault();
          handleSelect(options[activeIndex]?.value);
        }
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          close(true);
        }
        break;
      case "Tab":
        if (open) setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        name={name}
        onClick={() => {
          if (open) close();
          else openList(selectedIndex >= 0 ? selectedIndex : 0);
        }}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-100 dark:hover:border-white/20"
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-zinc-400 transition-transform duration-200 dark:text-zinc-500 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          aria-activedescendant={optionId(activeIndex)}
          tabIndex={-1}
          className="animate-pop absolute left-0 right-0 z-30 mt-2 max-h-64 overflow-auto rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-[var(--shadow-soft)] dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/40"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;
            return (
              <div
                key={option.value}
                id={optionId(index)}
                data-index={index}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => handleSelect(option.value)}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                  isSelected
                    ? "bg-gradient-to-r from-pink-500/15 to-purple-500/15 font-bold text-ig-pink dark:text-pink-300"
                    : isActive
                      ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-white/10 dark:text-zinc-100"
                      : "font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="size-4 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
