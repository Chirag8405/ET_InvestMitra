"use client";

import { useMemo } from "react";
import { Volume2, Square } from "lucide-react";

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

const CONTRARIAN_MARKERS = [
  "**CONTRARIAN CORNER**",
  "**Contrarian Corner**",
  "**CONTRARIAN VIEW**",
  "CONTRARIAN CORNER",
  "**THE OTHER SIDE**",
  "**BEAR CASE**",
];

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
}: ChatMessageProps): React.JSX.Element {
  const isUser = message.role === "user";

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
  const mainHtml = useMemo(() => parseMarkdownInline(parsed.main || message.content), [parsed.main, message.content]);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-black px-4 py-3 text-sm leading-6 text-white sm:max-w-[72%]">
          {message.content}
        </div>
      </div>
    );
  }

  const stepsToShow = isLoading ? activeSteps : message.steps || [];

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-2xl border border-black bg-white px-4 py-3 text-sm text-zinc-900 sm:max-w-[80%]">
        <ReasoningChain steps={stepsToShow} isLoading={isLoading} />

        <div className="leading-6" dangerouslySetInnerHTML={{ __html: mainHtml }} />

        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.citations.map((citation, idx) => (
              <SourceBadge key={`${citation.label}-${idx}`} citation={citation} />
            ))}
          </div>
        )}

        <ContrarianCorner text={message.contrarian || parsed.contrarian} />

        <div className="mt-4 flex items-center">
          <button
            type="button"
            onClick={() => (isSpeaking ? onStopSpeaking() : onSpeak(message.content))}
            className="inline-flex items-center gap-2 border border-zinc-400 px-2 py-1 text-xs text-zinc-700 hover:border-black hover:text-black"
          >
            {isSpeaking ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            {isSpeaking ? "Stop voice" : "Read aloud"}
          </button>
        </div>
      </div>
    </div>
  );
}
