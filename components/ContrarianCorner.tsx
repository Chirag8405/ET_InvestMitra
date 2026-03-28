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
    <section className="mt-4 border-l-2 border-black pl-3">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="text-xs text-zinc-700 hover:text-black"
      >
        {open ? "Hide bear case ↑" : "See bear case ↓"}
      </button>

      {open && (
        <div className="mt-2">
          <p className="mb-2 text-[11px] tracking-[0.08em] text-zinc-700 uppercase">CONTRARIAN VIEW</p>
          <div
            className="text-sm leading-6 text-zinc-900"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      )}
    </section>
  );
}
