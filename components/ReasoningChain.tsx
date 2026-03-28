"use client";

import { useEffect, useState } from "react";

import type { ReasoningStep } from "../types";

type ReasoningChainProps = {
  steps: ReasoningStep[];
  isLoading: boolean;
};

export function ReasoningChain({ steps, isLoading }: ReasoningChainProps): React.JSX.Element | null {
  const [visible, setVisible] = useState<boolean>(isLoading);
  const [collapsing, setCollapsing] = useState<boolean>(false);

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      setCollapsing(false);
      return;
    }

    if (!visible) return;
    setCollapsing(true);
    const timeout = window.setTimeout(() => {
      setVisible(false);
      setCollapsing(false);
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [isLoading, visible]);

  if (!steps.length || !visible) return null;

  return (
    <div
      className={`mb-4 overflow-hidden transition-all duration-[400ms] ${
        collapsing ? "max-h-0 opacity-0" : "max-h-24 opacity-100"
      }`}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {steps.map((step, idx) => {
          const pending = step.status === "pending";
          const running = step.status === "running";
          const done = step.status === "done";
          return (
            <div key={`${step.label}-${idx}`} className="inline-flex items-center gap-2">
              <span
                className={`text-xs ${
                  pending ? "opacity-30 text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"
                } ${running ? "reasoning-pulse" : ""}`}
              >
                {done ? "✓" : step.icon}
              </span>
              <span
                className={
                  running
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-tertiary)]"
                }
              >
                {step.label}
              </span>
              {idx < steps.length - 1 ? (
                <span className="text-[var(--text-tertiary)]" aria-hidden="true">
                  ›
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
