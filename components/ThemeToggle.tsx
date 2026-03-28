"use client";

type ThemeToggleProps = {
  theme: "light" | "dark";
  onToggle: () => void;
  className?: string;
};

export function ThemeToggle({ theme, onToggle, className }: ThemeToggleProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-[var(--radius-sm)] border border-[var(--border-default)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] ${className || ""}`}
      aria-label="Toggle theme"
      title="Toggle light and dark theme"
    >
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
