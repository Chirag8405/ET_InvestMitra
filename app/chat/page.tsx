"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, Mic, PanelBottomOpen } from "lucide-react";

import { ChatMessage } from "../../components/ChatMessage";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../components/ui/sheet";
import { Switch } from "../../components/ui/switch";
import { useChat } from "../../hooks/useChat";
import { useDecisionLog } from "../../hooks/useDecisionLog";
import { usePortfolio } from "../../hooks/usePortfolio";
import { stripForVoice, useVoice } from "../../hooks/useVoice";
import type { UserMode } from "../../types";

const PROMPTS = [
  "Should I add more HDFC Bank to my portfolio?",
  "Which of my holdings are most overvalued right now?",
  "What is the market telling me about IT stocks today?",
  "Am I too concentrated in any sector?",
];

type StockSnapshot = {
  price: number;
};

type NiftySnapshot = {
  price: number;
  changePercent: number;
  source: string;
};

const NIFTY_CACHE_KEY = "im_nifty_snapshot";
const NIFTY_CACHE_TTL_MS = 60_000;

function modeLabel(mode: UserMode): string {
  return mode === "analyst" ? "Analyst" : "Explain It To Me";
}

function SkeletonLine({ width }: { width: string }): React.JSX.Element {
  return <div className={`h-3 animate-pulse bg-zinc-200 ${width}`} />;
}

function SidebarPanel({
  profile,
  prices,
  holdingsLoading,
  holdingsError,
  onUpdateMode,
  onClearChat,
  autoVoiceEnabled,
  onToggleAutoVoice,
  decisionCount,
  disciplineScore,
}: {
  profile: ReturnType<typeof usePortfolio>["profile"];
  prices: Record<string, StockSnapshot>;
  holdingsLoading: boolean;
  holdingsError: string | null;
  onUpdateMode: (mode: UserMode) => void;
  onClearChat: () => void;
  autoVoiceEnabled: boolean;
  onToggleAutoVoice: (enabled: boolean) => void;
  decisionCount: number;
  disciplineScore: number;
}): React.JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <p className="text-xs tracking-[0.08em] text-zinc-600 uppercase">InvestMitra</p>
        <h1 className="mt-1 text-xl font-semibold text-black">InvestMitra</h1>
      </div>

      {profile && (
        <section className="mb-6 border border-zinc-300 p-4 text-sm">
          <p className="text-xs tracking-[0.08em] text-zinc-600 uppercase">Profile</p>
          <p className="mt-2 text-zinc-800">Age: {profile.ageGroup}</p>
          <p className="text-zinc-800">Risk: {profile.riskProfile}</p>
          <p className="text-zinc-800">Mode: {modeLabel(profile.mode)}</p>
        </section>
      )}

      {profile && (
        <section className="mb-6 border border-zinc-300 p-4 text-sm">
          <p className="text-xs tracking-[0.08em] text-zinc-600 uppercase">Holdings</p>
          <div className="mt-3 space-y-2">
            {holdingsLoading && (
              <div className="space-y-2">
                <SkeletonLine width="w-full" />
                <SkeletonLine width="w-5/6" />
                <SkeletonLine width="w-2/3" />
              </div>
            )}

            {!holdingsLoading && profile.holdings.length === 0 && (
              <p className="text-zinc-500">No holdings added.</p>
            )}

            {!holdingsLoading &&
              profile.holdings.map((holding) => {
                const snapshot = prices[holding.ticker];
                const pnl = snapshot
                  ? ((snapshot.price - holding.avgBuyPrice) / holding.avgBuyPrice) * 100
                  : null;

                return (
                  <div key={`${holding.ticker}-${holding.quantity}`} className="flex items-center justify-between">
                    <span className="font-medium text-zinc-900">{holding.ticker}</span>
                    <span className="text-xs text-zinc-700">
                      {pnl === null ? "--" : `${pnl > 0 ? "+" : ""}${pnl.toFixed(1)}%`}
                    </span>
                  </div>
                );
              })}
          </div>
          {holdingsError && <p className="mt-3 text-xs text-zinc-600">{holdingsError}</p>}
        </section>
      )}

      {profile && (
        <section className="mb-6 border border-zinc-300 p-4 text-sm">
          <p className="text-xs tracking-[0.08em] text-zinc-600 uppercase">My Decisions</p>
          <p className="mt-2 text-zinc-800">Total decisions logged: {decisionCount}</p>
          <p className="text-zinc-800">Discipline Score: {disciplineScore}/100</p>
        </section>
      )}

      {profile && (
        <section className="mb-6">
          <p className="mb-2 text-xs tracking-[0.08em] text-zinc-600 uppercase">Mode</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onUpdateMode("analyst")}
              className={`border px-2 py-2 text-xs ${
                profile.mode === "analyst"
                  ? "border-black bg-black text-white"
                  : "border-zinc-400 bg-white text-zinc-900"
              }`}
            >
              Analyst
            </button>
            <button
              type="button"
              onClick={() => onUpdateMode("explain")}
              className={`border px-2 py-2 text-xs ${
                profile.mode === "explain"
                  ? "border-black bg-black text-white"
                  : "border-zinc-400 bg-white text-zinc-900"
              }`}
            >
              Explain It To Me
            </button>
          </div>
        </section>
      )}

      {profile && (
        <section className="mb-6 border border-zinc-300 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-zinc-800">Read responses aloud</span>
            <Switch
              checked={autoVoiceEnabled}
              onCheckedChange={onToggleAutoVoice}
              aria-label="Read responses aloud"
            />
          </div>
        </section>
      )}

      <div className="mt-auto space-y-3 pt-2">
        <Link href="/signals" className="block text-sm text-zinc-700 underline underline-offset-4 hover:text-black">
          Open Top Signals
        </Link>
        <Link href="/" className="block text-sm text-zinc-700 underline underline-offset-4 hover:text-black">
          Edit Portfolio
        </Link>
        <button
          type="button"
          onClick={onClearChat}
          className="w-full border border-black bg-white px-3 py-2 text-sm text-black"
        >
          Clear chat
        </button>
      </div>
    </div>
  );
}

function ChatPageContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, isOnboarded, isReady, saveProfile } = usePortfolio();
  const { messages, isLoading, currentSteps, sendMessage, clearChat } = useChat();
  const { getLogs, getBehavioralScore } = useDecisionLog();

  const [draft, setDraft] = useState("");
  const { speak, stop, isSpeaking, isListeningSupported, isListening, startListening } = useVoice((transcript) => {
    setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript));
  });

  const [prices, setPrices] = useState<Record<string, StockSnapshot>>({});
  const [pending, setPending] = useState(false);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [holdingsError, setHoldingsError] = useState<string | null>(null);
  const [niftyLoading, setNiftyLoading] = useState(true);
  const [niftyError, setNiftyError] = useState<string | null>(null);
  const [niftyData, setNiftyData] = useState<NiftySnapshot | null>(null);
  const [autoVoiceEnabled, setAutoVoiceEnabled] = useState(false);
  const [decisionCount, setDecisionCount] = useState(0);
  const [disciplineScore, setDisciplineScore] = useState(0);
  const [greetingLabel, setGreetingLabel] = useState("day");

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!isOnboarded) {
      router.replace("/");
    }
  }, [isOnboarded, isReady, router]);

  useEffect(() => {
    const prefill = searchParams?.get("q");
    if (prefill && !messages.length) {
      setDraft(prefill);
    }
  }, [searchParams, messages.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAutoVoiceEnabled(window.localStorage.getItem("et_auto_voice") === "true");
  }, []);

  useEffect(() => {
    setDecisionCount(getLogs().length);
    setDisciplineScore(getBehavioralScore());
  }, [messages, getLogs, getBehavioralScore]);

  useEffect(() => {
    const currentHour = new Date().getHours();
    setGreetingLabel(currentHour < 12 ? "morning" : "afternoon");
  }, []);

  useEffect(() => {
    if (!profile?.holdings?.length) {
      setHoldingsLoading(false);
      return;
    }

    let mounted = true;
    setHoldingsLoading(true);
    setHoldingsError(null);

    Promise.all(
      profile.holdings.map(async (holding) => {
        try {
          const response = await fetch(`/api/stock?ticker=${encodeURIComponent(holding.ticker)}`);
          if (!response.ok) return null;
          const payload = (await response.json()) as { ticker: string; price: number };
          return { ticker: holding.ticker, price: payload.price };
        } catch {
          return null;
        }
      })
    )
      .then((rows) => {
        if (!mounted) return;
        const next: Record<string, StockSnapshot> = {};
        let failed = 0;
        for (const row of rows) {
          if (!row) {
            failed += 1;
            continue;
          }
          next[row.ticker] = { price: row.price };
        }
        setPrices(next);
        if (failed > 0) {
          setHoldingsError("Some holding prices are unavailable right now.");
        }
      })
      .finally(() => {
        if (mounted) setHoldingsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [profile?.holdings]);

  useEffect(() => {
    let mounted = true;
    setNiftyLoading(true);
    setNiftyError(null);

    if (typeof window !== "undefined") {
      const raw = window.sessionStorage.getItem(NIFTY_CACHE_KEY);
      if (raw) {
        try {
          const cached = JSON.parse(raw) as { data: NiftySnapshot; timestamp: number };
          if (Date.now() - cached.timestamp < NIFTY_CACHE_TTL_MS) {
            setNiftyData(cached.data);
            setNiftyLoading(false);
            return () => {
              mounted = false;
            };
          }
        } catch {
          // Ignore malformed cache and fetch fresh data.
        }
      }
    }

    fetch("/api/stock?ticker=NIFTY50")
      .then(async (response) => {
        if (!response.ok) throw new Error("Nifty fetch failed");
        return (await response.json()) as {
          price: number;
          changePercent: number;
          source: string;
        };
      })
      .then((payload) => {
        if (!mounted) return;
        const nextData = {
          price: payload.price,
          changePercent: payload.changePercent,
          source: payload.source,
        };
        setNiftyData(nextData);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            NIFTY_CACHE_KEY,
            JSON.stringify({ data: nextData, timestamp: Date.now() })
          );
        }
      })
      .catch(() => {
        if (mounted) setNiftyError("Nifty 50 live data unavailable.");
      })
      .finally(() => {
        if (mounted) setNiftyLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const hasSentMessage = useMemo(
    () => messages.some((message) => message.role === "user"),
    [messages]
  );

  const handleSend = async (text: string): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed || pending || isLoading) return;

    setPending(true);
    setDraft("");
    try {
      await sendMessage(trimmed, (finalContent) => {
        speak(stripForVoice(finalContent));
      });
    } finally {
      setPending(false);
    }
  };

  const toggleAutoVoice = (checked: boolean): void => {
    setAutoVoiceEnabled(checked);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("et_auto_voice", String(checked));
    }
  };

  const updateMode = (mode: UserMode): void => {
    if (!profile || profile.mode === mode) return;
    saveProfile({ ...profile, mode });
  };

  return (
    <main
      className="h-screen overflow-hidden bg-white text-zinc-900"
      style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}
    >
      <div className="mx-auto flex h-full w-full max-w-[1400px] lg:flex-row">
        <aside className="hidden h-full w-[280px] shrink-0 border-r border-zinc-300 p-6 lg:flex">
          <div className="h-full w-full overflow-y-auto pr-1">
            <SidebarPanel
              profile={profile}
              prices={prices}
              holdingsLoading={holdingsLoading}
              holdingsError={holdingsError}
              onUpdateMode={updateMode}
              onClearChat={clearChat}
              autoVoiceEnabled={autoVoiceEnabled}
              onToggleAutoVoice={toggleAutoVoice}
              decisionCount={decisionCount}
              disciplineScore={disciplineScore}
            />
          </div>
        </aside>

        <section className="relative flex h-full flex-1 flex-col overflow-hidden">
          <div className="border-b border-zinc-300 px-4 py-3 lg:hidden">
            <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
              <div>
                <p className="text-xs tracking-[0.08em] text-zinc-600 uppercase">InvestMitra</p>
                <p className="text-sm font-semibold">InvestMitra</p>
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <button type="button" className="inline-flex items-center gap-2 border border-zinc-400 px-3 py-2 text-xs">
                    <PanelBottomOpen className="h-4 w-4" />
                    Portfolio
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[82vh] overflow-y-auto bg-white">
                  <SheetHeader>
                    <SheetTitle className="text-black">Portfolio Panel</SheetTitle>
                  </SheetHeader>
                  <div className="px-4 pb-6">
                    <SidebarPanel
                      profile={profile}
                      prices={prices}
                      holdingsLoading={holdingsLoading}
                      holdingsError={holdingsError}
                      onUpdateMode={updateMode}
                      onClearChat={clearChat}
                      autoVoiceEnabled={autoVoiceEnabled}
                      onToggleAutoVoice={toggleAutoVoice}
                      decisionCount={decisionCount}
                      disciplineScore={disciplineScore}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 pb-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-4xl space-y-4">
              {messages.length === 0 && (
                <div className="border border-zinc-300 p-5 text-sm text-zinc-700">
                  <p className="mb-2 text-base text-black">
                    Good {greetingLabel}, here is what markets are doing today.
                  </p>
                  {niftyLoading && (
                    <div className="space-y-2">
                      <SkeletonLine width="w-40" />
                      <SkeletonLine width="w-24" />
                    </div>
                  )}
                  {!niftyLoading && niftyData && (
                    <p>
                      Nifty 50: {niftyData.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })} ({niftyData.changePercent > 0 ? "+" : ""}
                      {niftyData.changePercent.toFixed(2)}%) [Source: {niftyData.source}]
                    </p>
                  )}
                  {!niftyLoading && niftyError && <p className="text-zinc-600">{niftyError}</p>}
                </div>
              )}

              {messages.map((message, index) => {
                const isLastAssistant =
                  message.role === "assistant" && index === messages.length - 1;

                return (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isLoading={isLoading && isLastAssistant}
                    activeSteps={isLoading && isLastAssistant ? currentSteps : message.steps || []}
                    onSpeak={speak}
                    onStopSpeaking={stop}
                    isSpeaking={isSpeaking}
                  />
                );
              })}
            </div>
          </div>

          <div className="shrink-0 border-t border-zinc-300 bg-white px-4 py-4 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-4xl">
              {!hasSentMessage && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSend(prompt)}
                      className="border border-zinc-400 bg-white px-3 py-2 text-xs text-zinc-800 hover:border-black"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSend(draft);
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ask about your portfolio and markets..."
                  className="h-11 flex-1 border border-zinc-400 px-3 text-sm outline-none focus:border-black"
                />
                {isListeningSupported && (
                  <button
                    type="button"
                    onClick={startListening}
                    title={isListening ? "Listening..." : "Use voice input"}
                    className={`h-11 w-11 border ${isListening ? "border-black bg-black text-white" : "border-zinc-400 bg-white text-zinc-700"}`}
                  >
                    <Mic className="mx-auto h-4 w-4" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={pending || isLoading || !draft.trim()}
                  className="h-11 w-11 border border-black bg-black text-white disabled:cursor-not-allowed disabled:border-zinc-500 disabled:bg-zinc-400"
                >
                  <ArrowUp className="mx-auto h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ChatPage(): React.JSX.Element {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white text-zinc-900" />}>
      <ChatPageContent />
    </Suspense>
  );
}
