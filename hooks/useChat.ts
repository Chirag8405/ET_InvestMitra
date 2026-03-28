import { useCallback, useEffect, useState } from "react";

import { useDecisionLog } from "./useDecisionLog";
import type { ChatMessage, ReasoningStep, UserProfile } from "../types";

const STORAGE_KEY = "et_user_profile";
const CHAT_STORAGE_KEY = "et_chat_history";
const MAX_STORED_MESSAGES = 50;

const INITIAL_STEPS: ReasoningStep[] = [
  { icon: "🔍", label: "Fetching live data", status: "pending" },
  { icon: "📊", label: "Analysing fundamentals", status: "pending" },
  { icon: "🧠", label: "Checking your portfolio", status: "pending" },
  { icon: "📰", label: "Scanning news signals", status: "pending" },
  { icon: "✍️", label: "Generating response", status: "pending" },
];

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function updateStep(
  steps: ReasoningStep[],
  index: number,
  status: ReasoningStep["status"]
): ReasoningStep[] {
  return steps.map((step, i) => (i === index ? { ...step, status } : step));
}

function getStoredProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

function detectBiasFromContrarian(content: string): string | undefined {
  const contrarianMatch = content.match(/CONTRARIAN CORNER([\s\S]*)$/i);
  const contrarianText = (contrarianMatch?.[1] || content).toLowerCase();
  const knownBiases = [
    "overconfidence",
    "anchoring",
    "confirmation bias",
    "herd mentality",
    "loss aversion",
    "recency bias",
    "disposition effect",
  ];
  return knownBiases.find((bias) => contrarianText.includes(bias));
}

function extractTickerFromQuestion(question: string): string | undefined {
  const match = question.toUpperCase().match(/\b[A-Z]{2,}\b/);
  return match?.[0];
}

export function useChat(): {
  messages: ChatMessage[];
  isLoading: boolean;
  currentSteps: ReasoningStep[];
  sendMessage: (text: string, onAutoSpeak?: (text: string) => void) => Promise<void>;
  clearChat: () => void;
} {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(CHAT_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored) as Array<ChatMessage & { timestamp: string }>;
      return parsed.map((message) => ({ ...message, timestamp: new Date(message.timestamp) }));
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentSteps, setCurrentSteps] = useState<ReasoningStep[]>([]);
  const { addLog } = useDecisionLog();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (messages.length === 0) return;
    const toStore = messages.slice(-MAX_STORED_MESSAGES);
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toStore));
  }, [messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setCurrentSteps([]);
    setIsLoading(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CHAT_STORAGE_KEY);
    }
  }, []);

  const sendMessage = useCallback(async (text: string, onAutoSpeak?: (text: string) => void) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: newId(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    const assistantId = newId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      steps: INITIAL_STEPS,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);
    setCurrentSteps(INITIAL_STEPS.map((s) => ({ ...s })));

    const profile = getStoredProfile();
    if (!profile) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? { ...msg, content: "Profile not found. Please complete onboarding first." }
            : msg
        )
      );
      setCurrentSteps((prev) => prev.map((step) => ({ ...step, status: "done" })));
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          profile,
          question: trimmed,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Chat request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let firstDataArrived = false;
      let textStarted = false;
      let finalContent = "";
      let meta: { firstTicker?: string; priceAtTime?: number } = {};

      const markStepDone = (idx: number): void => {
        setCurrentSteps((prev) => updateStep(prev, idx, "done"));
      };

      const markStepRunning = (idx: number): void => {
        setCurrentSteps((prev) => updateStep(prev, idx, "running"));
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const eventChunk of events) {
          const line = eventChunk
            .split("\n")
            .map((l) => l.trim())
            .find((l) => l.startsWith("data: "));

          if (!line) continue;
          const data = line.slice(6);

          if (!firstDataArrived) {
            markStepDone(0);
            markStepDone(1);
            markStepDone(2);
            markStepDone(3);
            markStepRunning(4);
            firstDataArrived = true;
          }

          if (data === "[DONE]") {
            markStepDone(4);
            setIsLoading(false);
            continue;
          }

          if (data.startsWith("META:")) {
            const payload = data.slice("META:".length);
            try {
              meta = JSON.parse(payload) as { firstTicker?: string; priceAtTime?: number };
            } catch {
              meta = {};
            }
            continue;
          }

          if (data.startsWith("THINKING:")) {
            const thinkingText = data.slice("THINKING:".length);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, reasoning: `${msg.reasoning || ""}${thinkingText}` }
                  : msg
              )
            );
            continue;
          }

          if (data.startsWith("CITATIONS:")) {
            const json = data.slice("CITATIONS:".length);
            try {
              const citations = JSON.parse(json);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId ? { ...msg, citations } : msg
                )
              );
            } catch {
              // Ignore malformed citations and continue streaming text.
            }
            continue;
          }

          if (!textStarted) {
            markStepRunning(4);
            textStarted = true;
          }

          finalContent += data;

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: `${msg.content}${data}` }
                : msg
            )
          );
        }
      }

      setCurrentSteps((prev) => prev.map((step) => ({ ...step, status: "done" })));
      setIsLoading(false);

      addLog({
        question: trimmed,
        decision: "viewed analysis",
        biasDetected: detectBiasFromContrarian(finalContent),
        ticker: meta.firstTicker || extractTickerFromQuestion(trimmed),
        priceAtTime: meta.priceAtTime ?? 0,
      });

      const autoVoice =
        typeof window !== "undefined" &&
        window.localStorage.getItem("et_auto_voice") === "true";
      if (autoVoice && finalContent && onAutoSpeak) {
        window.setTimeout(() => onAutoSpeak(finalContent), 400);
      }
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content: "Unable to fetch response right now. Please try again.",
              }
            : msg
        )
      );
      setCurrentSteps((prev) => prev.map((step) => ({ ...step, status: "done" })));
      setIsLoading(false);
    }
  }, [messages, addLog]);

  return {
    messages,
    isLoading,
    currentSteps,
    sendMessage,
    clearChat,
  };
}
