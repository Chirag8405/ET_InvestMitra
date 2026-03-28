"use client";

import { useEffect, useState } from "react";

import type { ReasoningStep } from "../types";

type ReasoningChainProps = {
  steps: ReasoningStep[];
  isLoading: boolean;
};

function StatusGlyph({ status }: { status: ReasoningStep["status"] }): React.JSX.Element {
  if (status === "running") {
    return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />;
  }
  if (status === "done") {
    return <span className="text-xs font-bold text-black">✓</span>;
  }
  return <span className="text-xs font-bold text-zinc-400">•</span>;
}

export function ReasoningChain({ steps, isLoading }: ReasoningChainProps): React.JSX.Element | null {
  const [expanded, setExpanded] = useState<boolean>(isLoading);

  useEffect(() => {
    if (isLoading) {
      setExpanded(true);
    } else {
      setExpanded(false);
    }
  }, [isLoading]);

  if (!steps.length) return null;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mb-3 text-xs text-zinc-600 underline underline-offset-4 hover:text-black"
      >
        Show reasoning
      </button>
    );
  }

  return (
    <div className="mb-3 border border-zinc-300 bg-white p-3">
      <div className="space-y-2">
        {steps.map((step, idx) => (
          <div key={`${step.label}-${idx}`} className="flex items-center gap-2 text-sm">
            <span className={`${step.status === "pending" ? "text-zinc-400" : "text-black"}`}>{step.icon}</span>
            <span className={`flex-1 ${step.status === "pending" ? "text-zinc-500" : "text-zinc-900"}`}>
              {step.label}...
            </span>
            <StatusGlyph status={step.status} />
          </div>
        ))}
      </div>
      {!isLoading && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-3 text-xs text-zinc-600 underline underline-offset-4 hover:text-black"
        >
          Hide reasoning
        </button>
      )}
    </div>
  );
}
