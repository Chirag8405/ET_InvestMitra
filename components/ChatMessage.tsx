"use client";

import { useMemo, useState } from "react";
import { Copy, RotateCcw, Square, Volume2 } from "lucide-react";

import { ContrarianCorner } from "./ContrarianCorner";
import { ReasoningChain } from "./ReasoningChain";
import { SourceBadge } from "./SourceBadge";
import type { ChatMessage as ChatMessageType, ReasoningStep } from "../types";

type ChatMessageProps = {
  message: ChatMessageType;
  isLoading: boolean;
  activeSteps: ReasoningStep[];
  onSpeak: (text: string) => void;
  onStopSpeaking: () => void;
  isSpeaking: boolean;
  onRetry?: () => void;
  animate?: boolean;
};

const SECTION_HEADERS = new Set<string>([
  "MARKET ASSESSMENT",
  "FOR YOUR PORTFOLIO",
  "WHAT'S HAPPENING",
  "WHAT THIS MEANS FOR YOU",
]);

const CONTRARIAN_MARKERS = [
  "**CONTRARIAN CORNER**",
  "**Contrarian Corner**",
  "**CONTRARIAN VIEW**",
  "CONTRARIAN CORNER",
  "**THE OTHER SIDE**",
  "**BEAR CASE**",
];

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function numericClass(token: string): string {
  const compact = token.replace(/[₹,%\s,xXPE\/]/g, "");
  const parsed = Number(compact);

  if (token.trim().startsWith("+")) return "finance-positive";
  if (token.trim().startsWith("-")) return "finance-negative";
  if (token.includes("%") && !Number.isNaN(parsed)) {
    if (parsed > 0) return "finance-positive";
    if (parsed < 0) return "finance-negative";
  }

  return "finance-neutral";
}

function wrapFinancialNumbers(input: string): string {
  const tokenPattern =
    /₹\s?\d[\d,]*(?:\.\d+)?|[+-]?\d+(?:\.\d+)?%|\b\d+\.\d+\s?(?:P\/E|PE|x)\b|\b\d+(?:-\d+)?(?:-week|w)\b|\b[+-]?\d[\d,]*(?:\.\d+)?\b/gi;

  return input.replace(tokenPattern, (token) => {
    const cls = numericClass(token);
    return `<span class="mono ${cls}" style="font-size:0.92em;">${token}</span>`;
  });
}

function normalizeHeader(line: string): string | null {
  const normalized = line.replace(/\*/g, "").trim().toUpperCase();
  return SECTION_HEADERS.has(normalized) ? normalized : null;
}

function formatInline(input: string): string {
  const escaped = escapeHtml(input);
  const withMarkdown = escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");

  return wrapFinancialNumbers(withMarkdown);
}

function formatAssistantHtml(content: string): string {
  const lines = content.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    const header = normalizeHeader(line);
    if (header) {
      out.push(`<h3 class="im-section-heading">${header}</h3>`);
      continue;
    }

    if (!line.trim()) {
      out.push('<div style="height:8px"></div>');
      continue;
    }

    out.push(`<p class="im-body-paragraph">${formatInline(line)}</p>`);
  }

  return out.join("");
}

function applyStreamingTail(html: string): string {
  let inTag = false;
  for (let i = html.length - 1; i >= 0; i -= 1) {
    const char = html[i];

    if (char === ">") {
      inTag = true;
      continue;
    }
    if (char === "<") {
      inTag = false;
      continue;
    }
    if (inTag || char.trim() === "") {
      continue;
    }

    return `${html.slice(0, i)}<span class="streaming-tail">${char}</span>${html.slice(i + 1)}`;
  }

  return html;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const extractContrarian = (content: string): string | null => {
  // Guard: don't parse error messages or non-AI/short content.
  if (!content || content.length < 50) return null;
  if (content.startsWith("Unable to")) return null;
  if (!content.includes("ASSESSMENT") && !content.includes("HAPPENING")) return null;

  for (const marker of CONTRARIAN_MARKERS) {
    const idx = content.indexOf(marker);
    if (idx !== -1) {
      const after = content.slice(idx + marker.length).trim();
      const cutoff = after.search(/\n---|\nThis is market|Friendly reminder/);
      const cleaned = cutoff !== -1 ? after.slice(0, cutoff).trim() : after.trim();
      if (cleaned.length > 20) return cleaned;
    }
  }

  if (content.includes("**MARKET ASSESSMENT**") || content.includes("**WHAT")) {
    console.warn("CONTRARIAN NOT FOUND in valid response:", content.slice(0, 200));
  }

  return null;
};

function splitMainAndContrarian(content: string): { main: string; contrarian: string } {
  const contrarianIndex = CONTRARIAN_MARKERS.reduce((idx, marker) => {
    const found = content.indexOf(marker);
    return found !== -1 && (idx === -1 || found < idx) ? found : idx;
  }, -1);

  const main = contrarianIndex === -1 ? content : content.slice(0, contrarianIndex).trim();
  return { main, contrarian: "" };
}

export function ChatMessage({
  message,
  isLoading,
  activeSteps,
  onSpeak,
  onStopSpeaking,
  isSpeaking,
  onRetry,
  animate,
}: ChatMessageProps): React.JSX.Element {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => {
    if (isUser) {
      return { main: message.content, contrarian: "" };
    }
    if (message.isStreaming) {
      return { main: message.content, contrarian: "" };
    }

    const contrarian = extractContrarian(message.content);
    const split = splitMainAndContrarian(message.content);
    return { ...split, contrarian: contrarian || "" };
  }, [isUser, message.content, message.isStreaming]);

  const mainHtml = useMemo(() => {
    const formatted = formatAssistantHtml(parsed.main || message.content);
    return message.isStreaming ? applyStreamingTail(formatted) : formatted;
  }, [message.content, message.isStreaming, parsed.main]);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1000);
    } catch {
      setCopied(false);
    }
  };

  if (isUser) {
    return (
      <div className={`mb-6 flex justify-end ${animate ? "message" : ""}`}>
        <div className="max-w-[78%] text-right">
          <p className="text-[15px] font-medium leading-[1.6] text-[var(--text-primary)]">{message.content}</p>
          <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{formatTimestamp(message.timestamp)}</p>
        </div>
      </div>
    );
  }

  const stepsToShow = isLoading ? activeSteps : message.steps || [];

  return (
    <article className={`mb-8 ${animate ? "message" : ""}`}>
      <div className="max-w-full">
        <ReasoningChain steps={stepsToShow} isLoading={isLoading} />

        <div className="leading-6" dangerouslySetInnerHTML={{ __html: mainHtml }} />

        {message.citations && message.citations.length > 0 && (
          <div className="hide-scrollbar mt-3 overflow-x-auto pb-1">
            <div className="flex w-max gap-2 whitespace-nowrap">
              {message.citations.map((citation, idx) => (
                <SourceBadge key={`${citation.label}-${idx}`} citation={citation} />
              ))}
            </div>
          </div>
        )}

        <ContrarianCorner text={message.contrarian || parsed.contrarian} />

        <div className="mt-4 flex items-center gap-1">
          <button
            type="button"
            onClick={() => (isSpeaking ? onStopSpeaking() : onSpeak(message.content))}
            className="im-icon-button relative inline-flex h-6 w-6 items-center justify-center text-[var(--text-tertiary)] transition-colors duration-150 hover:text-[var(--text-primary)]"
            aria-label={isSpeaking ? "Stop voice" : "Read aloud"}
          >
            {isSpeaking ? <Square className="h-[14px] w-[14px]" /> : <Volume2 className="h-[14px] w-[14px]" />}
            <span className="im-tooltip">{isSpeaking ? "Stop voice" : "Read aloud"}</span>
          </button>

          <button
            type="button"
            onClick={() => onRetry?.()}
            disabled={!onRetry}
            className="im-icon-button relative inline-flex h-6 w-6 items-center justify-center text-[var(--text-tertiary)] transition-colors duration-150 hover:text-[var(--text-primary)] disabled:opacity-40"
            aria-label="Retry answer"
          >
            <RotateCcw className="h-[14px] w-[14px]" />
            <span className="im-tooltip">Retry</span>
          </button>

          <button
            type="button"
            onClick={() => void handleCopy()}
            className="im-icon-button relative inline-flex h-6 w-6 items-center justify-center text-[var(--text-tertiary)] transition-colors duration-150 hover:text-[var(--text-primary)]"
            aria-label="Copy answer"
          >
            <Copy className="h-[14px] w-[14px]" />
            <span className="im-tooltip">{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
