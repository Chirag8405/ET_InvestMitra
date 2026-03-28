"use client";

import { ExternalLink } from "lucide-react";

import type { SourceCitation } from "../types";

type SourceBadgeProps = {
  citation: SourceCitation;
};

export function SourceBadge({ citation }: SourceBadgeProps): React.JSX.Element {
  const content = (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-black bg-white px-2 py-1 font-mono text-[11px] text-black"
      title={citation.url || "No URL available"}
    >
      {citation.label} | {citation.timestamp}
      {citation.url && <ExternalLink className="h-[10px] w-[10px]" />}
    </span>
  );

  if (citation.url) {
    return (
      <a
        href={citation.url}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
        title={citation.url}
      >
        {content}
      </a>
    );
  }

  return (
    content
  );
}
