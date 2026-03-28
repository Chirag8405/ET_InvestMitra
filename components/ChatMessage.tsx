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

function splitContrarian(content: string): { main: string; contrarian: string } {
  const contrarian_markers = [
    "CONTRARIAN CORNER",
    "Contrarian Corner",
    "contrarian corner",
    "THE OTHER SIDE",
    "The Other Side",
  ];
  const contrarianIndex = contrarian_markers.reduce((idx, marker) => {
    const found = content.indexOf(marker);
    return found !== -1 && (idx === -1 || found < idx) ? found : idx;
  }, -1);

  if (contrarianIndex === -1) {
    return { main: content, contrarian: "" };
  }

  const main = content.slice(0, contrarianIndex).trim();
  const afterHeader = content.slice(contrarianIndex);
  const newlineIndex = afterHeader.indexOf("\n");
  const contrarian = (newlineIndex === -1 ? "" : afterHeader.slice(newlineIndex + 1)).trim();
  return { main, contrarian };
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

  const parsed = useMemo(() => splitContrarian(message.content), [message.content]);
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
