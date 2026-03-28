import { useCallback, useEffect, useState } from "react";

declare global {
  interface SpeechRecognitionResultItem {
    transcript: string;
  }

  interface SpeechRecognitionResultListItem {
    0: SpeechRecognitionResultItem;
  }

  interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultListItem[];
  }

  interface SpeechRecognitionLike {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
    start: () => void;
  }

  interface SpeechRecognitionCtor {
    new (): SpeechRecognitionLike;
  }

  interface Window {
    webkitSpeechSynthesis?: SpeechSynthesis;
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function removeCitations(text: string): string {
  return text
    .replace(/\[Source:[^\]]*\]/gi, "")
    .replace(/CITATIONS:\{[\s\S]*?\}/gi, "")
    .replace(/\(Source:[^)]+\)/gi, "")
    .trim();
}

function stripContrarianSection(text: string): string {
  const contrarian_markers = [
    "CONTRARIAN CORNER",
    "Contrarian Corner",
    "contrarian corner",
    "THE OTHER SIDE",
    "The Other Side",
  ];

  const contrarianIndex = contrarian_markers.reduce((idx, marker) => {
    const found = text.indexOf(marker);
    return found !== -1 && (idx === -1 || found < idx) ? found : idx;
  }, -1);

  return contrarianIndex === -1 ? text : text.slice(0, contrarianIndex);
}

function extractReadableSections(text: string): string {
  const normalized = text.replace(/\r/g, "");

  const marketMatch = normalized.match(
    /\*\*MARKET ASSESSMENT\*\*([\s\S]*?)(\*\*FOR YOUR PORTFOLIO\*\*|$)/i
  );

  const portfolioMatch = normalized.match(
    /\*\*FOR YOUR PORTFOLIO\*\*([\s\S]*?)(\*\*CONTRARIAN CORNER\*\*|$)/i
  );

  const marketSection = marketMatch ? marketMatch[1] : "";
  const portfolioSection = portfolioMatch ? portfolioMatch[1] : "";

  const combined = `${marketSection}\n${portfolioSection}`.trim();
  return combined || normalized;
}

export function stripForVoice(text: string): string {
  const raw = extractReadableSections(text);
  const withoutContrarian = stripContrarianSection(raw);
  return stripMarkdown(removeCitations(withoutContrarian));
}

export function useVoice(onTranscript?: (text: string) => void): {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  isListening: boolean;
  isListeningSupported: boolean;
  startListening: () => void;
} {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isListeningSupported, setIsListeningSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsSupported(
      typeof window.speechSynthesis !== "undefined" &&
        typeof SpeechSynthesisUtterance !== "undefined"
    );
    setIsListeningSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    if (!isSupported) return;
    const synth = window.speechSynthesis;
    const onVoicesChanged = (): void => {
      // Triggered to ensure voices are loaded for later speak() calls.
    };

    synth.addEventListener("voiceschanged", onVoicesChanged);
    return () => {
      synth.removeEventListener("voiceschanged", onVoicesChanged);
    };
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  const speak = useCallback((text: string) => {
    if (!isSupported) return;

    const cleaned = stripForVoice(text);

    if (!cleaned) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.lang = "en-IN";

    const voices = synth.getVoices();
    const indianVoice = voices.find((voice) => voice.lang.toLowerCase().includes("en-in"));
    if (indianVoice) {
      utterance.voice = indianVoice;
      utterance.lang = indianVoice.lang;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synth.speak(utterance);
  }, [isSupported]);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      if (transcript && onTranscript) {
        onTranscript(transcript);
      }
    };
    recognition.start();
  }, [onTranscript]);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
    isListening,
    isListeningSupported,
    startListening,
  };
}
