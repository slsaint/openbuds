// Shared UI primitives. Keep all the low-level styling here so the screens read
// cleanly and stay visually consistent.
import { useState, useRef, useEffect, useLayoutEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] " +
        className
      }
    >
      {(title || subtitle) && (
        <header className="border-b border-[var(--color-border)] px-5 py-3">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {subtitle && (
            <p className="text-xs text-[var(--color-muted)]">{subtitle}</p>
          )}
        </header>
      )}
      <div className="px-5 py-2">{children}</div>
    </section>
  );
}

export function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm text-[var(--color-text)]">{label}</p>
        {hint && <p className="text-xs text-[var(--color-muted)]">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={
        "inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 " +
        (checked
          ? "bg-[var(--color-accent)]"
          : "bg-[var(--color-surface-2)] ring-1 ring-inset ring-[var(--color-border)]")
      }
    >
      <span
        className={
          "inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 " +
          (checked ? "translate-x-[23px]" : "translate-x-[3px]")
        }
      />
    </button>
  );
}

// A segmented button group — the clear alternative to a dropdown for a few options.
export function Segmented({
  options,
  labels,
  value,
  onChange,
  icons,
  size = "sm",
}: {
  options: string[];
  labels: string[];
  value: string | null;
  onChange: (v: string) => void;
  icons?: Record<string, ReactNode>;
  size?: "sm" | "lg";
}) {
  const big = size === "lg";
  return (
    <div
      className={
        "inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-1 " +
        (big ? "w-full gap-1" : "gap-0.5")
      }
    >
      {options.map((opt, i) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={
              (big ? "flex-1 flex-col gap-1.5 px-3 py-3 " : "px-3 py-1.5 ") +
              "flex items-center justify-center rounded-md text-sm font-medium transition " +
              (active
                ? "bg-[var(--color-accent)] text-white shadow"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]")
            }
          >
            {icons?.[opt] && <span>{icons[opt]}</span>}
            <span>{labels[i] ?? opt}</span>
          </button>
        );
      })}
    </div>
  );
}

// Custom dark-themed dropdown. We don't use a native <select> because the OS
// (GTK/webkit) renders it with the system theme — a light control and a native
// popup that clash with the dark UI. The menu renders in a portal with fixed
// positioning so it's never clipped by a scroll container.
export function Dropdown({
  options,
  labels,
  value,
  allowNone,
  onChange,
  fullWidth,
}: {
  options: string[];
  labels: string[];
  value: string;
  allowNone?: boolean;
  onChange: (v: string) => void;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);

  const items = [
    ...(allowNone ? [{ v: "", l: "None" }] : []),
    ...options.map((o, i) => ({ v: o, l: labels[i] ?? o })),
  ];
  const selected = value ?? "";
  const current = items.find((it) => it.v === selected);

  // Position the menu above or below the button depending on available space.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const width = Math.max(r.width, 180);
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const spaceAbove = r.top - 8;
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    setPos({
      left: Math.min(r.left, window.innerWidth - width - 8),
      width,
      ...(openUp
        ? { bottom: window.innerHeight - r.top + 4, maxHeight: spaceAbove }
        : { top: r.bottom + 4, maxHeight: spaceBelow }),
    });
  }, [open]);

  // Close on outside click, background scroll, or resize — but NOT when the
  // interaction happens inside the menu (scrolling the list, clicking an option).
  useEffect(() => {
    if (!open) return;
    const close = (e?: Event) => {
      const t = e?.target as Node | undefined;
      const inMenu = !!t && !!menuRef.current && menuRef.current.contains(t);
      const inBtn = !!t && !!btnRef.current && btnRef.current.contains(t);
      if (e?.type === "mousedown" && (inMenu || inBtn)) return;
      if (e?.type === "scroll" && inMenu) return; // allow scrolling the menu
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className={
          "flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm transition " +
          (fullWidth ? "w-full " : "min-w-[9rem] ") +
          (open
            ? "border-[var(--color-accent)] bg-[var(--color-surface-2)] "
            : "border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-muted)]")
        }
      >
        <span className="truncate text-[var(--color-text)]">
          {current?.l ?? "Select…"}
        </span>
        <ChevronDown
          className={
            "h-4 w-4 shrink-0 text-[var(--color-muted)] transition-transform " +
            (open ? "rotate-180" : "")
          }
        />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-2xl"
            style={{
              left: pos.left,
              width: pos.width,
              top: pos.top,
              bottom: pos.bottom,
              maxHeight: pos.maxHeight,
            }}
          >
            {items.map((it) => {
              const active = it.v === selected;
              return (
                <button
                  key={it.v || "__none__"}
                  onClick={() => {
                    onChange(it.v);
                    setOpen(false);
                  }}
                  className={
                    "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition " +
                    (active
                      ? "bg-[var(--color-accent-soft)] text-[var(--color-text)]"
                      : "text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]")
                  }
                >
                  <span className="truncate">{it.l}</span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}

export function Slider({
  value,
  min,
  max,
  step,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onCommit: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-6 text-right text-xs tabular-nums text-[var(--color-muted)]">
        {min}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step || 1}
        defaultValue={value}
        key={value} // reset uncontrolled slider when the device reports a new value
        onMouseUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
        className="w-44 accent-[var(--color-accent)]"
      />
      <span className="w-6 text-xs tabular-nums text-[var(--color-muted)]">
        {max}
      </span>
    </div>
  );
}

// Muted read-only value, visually distinct from interactive controls.
export function ReadOnlyValue({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-[var(--color-surface-2)] px-2 py-1 text-xs tabular-nums text-[var(--color-muted)]">
      {children}
    </span>
  );
}
