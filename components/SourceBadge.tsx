"use client";

import type { SourceCitation } from "../types";

type SourceBadgeProps = {
  citation: SourceCitation;
};

export function SourceBadge({ citation }: SourceBadgeProps): React.JSX.Element {
  const fullTitle = `${citation.label} | ${citation.timestamp}${citation.url ? ` | ${citation.url}` : ""}`;

  const content = (
    <span
      className="mono inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-2 py-[2px] text-[11px] text-[var(--text-tertiary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)]"
      title={fullTitle}
    >
      {citation.label} | {citation.timestamp}
    </span>
  );

  if (citation.url) {
    return (
      <a
        href={citation.url}
        target="_blank"
        rel="noopener noreferrer"
        title={fullTitle}
      >
        {content}
      </a>
    );
  }

  return content;
}
