"use client";

import { useMemo, useState } from "react";

type ContrarianCornerProps = {
  text?: string;
};

function parseMarkdownInline(input: string): string {
  const escaped = input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br />");
}

export function ContrarianCorner({ text }: ContrarianCornerProps): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  const cleaned = (text || "").trim();

  const html = useMemo(() => parseMarkdownInline(cleaned), [cleaned]);

  if (!cleaned) return null;

  return (
    <section className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full border-l-2 border-[var(--border-default)] pl-3 text-left text-[13px] font-medium text-[var(--text-secondary)] transition-all duration-150 hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]"
      >
        Bear case {open ? "↑" : "↓"}
      </button>

      <div
        className={`overflow-hidden transition-all duration-[250ms] ease-out ${
          open ? "max-h-[70vh] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mt-2 border-l-2 border-[var(--text-primary)] rounded-r-[var(--radius-md)] bg-[var(--bg-secondary)] px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
              CONTRARIAN VIEW
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              ↑ Hide
            </button>
          </div>
          <div
            className="text-[14px] leading-[1.6] text-[var(--text-primary)]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </section>
  );
}
