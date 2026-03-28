"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUp } from "lucide-react";

import { ChatMessage } from "../../components/ChatMessage";
import { useChat } from "../../hooks/useChat";
import { usePortfolio } from "../../hooks/usePortfolio";
import { stripForVoice, useVoice } from "../../hooks/useVoice";
import type { UserMode } from "../../types";

const PROMPTS = [
  "Which of my holdings looks overvalued right now?",
  "Where am I most concentrated by sector?",
  "What is the bear case for HDFCBANK this month?",
  "Should I trim any position based on current momentum?",
];

const INPUT_HINTS = [
  "Try: Which of my holdings is overvalued?",
  "Try: What is my highest risk position?",
  "Try: Give me the contrarian view on RELIANCE",
  "Try: Am I overexposed to one sector?",
];

const SIGNAL_UNIVERSE = [
  "RELIANCE",
  "HDFCBANK",
  "TCS",
  "INFY",
  "ICICIBANK",
  "SBIN",
  "AXISBANK",
  "BAJFINANCE",
] as const;

type StockSnapshot = {
  price: number;
  changePercent: number;
};

type SidebarSignal = {
  ticker: string;
  changePercent: number;
  price: number;
};

function formatRupee(value: number, fractionDigits = 0): string {
  return `\u20B9${value.toLocaleString("en-IN", { maximumFractionDigits: fractionDigits })}`;
}

function signedPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function changeColor(value: number): string {
  if (value > 0) return "finance-positive";
  if (value < 0) return "finance-negative";
  return "finance-neutral";
}

function modeLabel(mode: UserMode): string {
  return mode === "analyst" ? "Analyst mode" : "Simple mode";
}

function riskLabel(riskProfile: string): string {
  return riskProfile.charAt(0).toUpperCase() + riskProfile.slice(1);
}

function findTicker(input: string, knownTickers: Set<string>): string | null {
  const candidates = input.toUpperCase().match(/\b[A-Z]{2,}\b/g) || [];
  for (const candidate of candidates) {
    if (knownTickers.has(candidate)) return candidate;
  }
  return candidates[0] || null;
}

function SidebarPanel({
  profile,
  holdingsRows,
  totalValue,
  totalChange,
  holdingsLoading,
  holdingsError,
  signals,
  onSignalClick,
  onUpdateMode,
  onOpenPortfolio,
}: {
  profile: ReturnType<typeof usePortfolio>["profile"];
  holdingsRows: Array<{
    ticker: string;
    quantity: number;
    currentPrice: number;
    pnlPercent: number;
  }>;
  totalValue: number;
  totalChange: number;
  holdingsLoading: boolean;
  holdingsError: string | null;
  signals: SidebarSignal[];
  onSignalClick: (ticker: string) => void;
  onUpdateMode: (mode: UserMode) => void;
  onOpenPortfolio: () => void;
}): React.JSX.Element {
  if (!profile) {
    return (
      <div className="flex h-full flex-col p-4">
        <p className="text-[15px] font-semibold text-[var(--text-primary)]">InvestMitra</p>
        <p className="mt-2 text-[12px] text-[var(--text-tertiary)]">Profile unavailable</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">InvestMitra</p>
        <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">
          {riskLabel(profile.riskProfile)} · {modeLabel(profile.mode)}
        </p>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
        <section>
          <h3>Portfolio</h3>
          <div className="mt-2">
            {holdingsLoading && (
              <div className="space-y-2 py-2">
                <div className="skeleton w-full" />
                <div className="skeleton w-[92%]" />
                <div className="skeleton w-[80%]" />
              </div>
            )}

            {!holdingsLoading && holdingsRows.length === 0 && (
              <p className="py-2 text-[12px] text-[var(--text-secondary)]">No holdings yet.</p>
            )}

            {!holdingsLoading &&
              holdingsRows.map((row) => (
                <div
                  key={`${row.ticker}-${row.quantity}`}
                  className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-2 text-left transition-colors duration-150 hover:bg-[var(--bg-tertiary)]"
                >
                  <span className="mono text-[13px] font-medium text-[var(--text-primary)]">{row.ticker}</span>
                  <span className="truncate text-[12px] text-[var(--text-secondary)]">
                    {row.quantity} × {formatRupee(row.currentPrice)}
                  </span>
                  <span className={`mono ml-auto text-[12px] ${changeColor(row.pnlPercent)}`}>
                    {signedPercent(row.pnlPercent)}
                  </span>
                </div>
              ))}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2">
            <span className="mono text-[12px] text-[var(--text-primary)]">Total · {formatRupee(totalValue)}</span>
            <span className={`mono text-[12px] ${changeColor(totalChange)}`}>Today {signedPercent(totalChange)}</span>
          </div>

          {holdingsError && <p className="mt-2 text-[12px] text-[var(--text-tertiary)]">{holdingsError}</p>}
        </section>

        <section className="mt-5">
          <h3>Signals</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {signals.slice(0, 4).map((signal) => {
              const positive = signal.changePercent >= 0;
              return (
                <button
                  key={signal.ticker}
                  type="button"
                  onClick={() => onSignalClick(signal.ticker)}
                  className={`mono inline-flex items-center gap-2 rounded-[var(--radius-sm)] border px-2 py-1 text-[12px] transition-colors duration-150 ${
                    positive
                      ? "border-[var(--accent-positive)] text-[var(--accent-positive)]"
                      : "border-[var(--accent-negative)] text-[var(--accent-negative)]"
                  }`}
                >
                  <span>{signal.ticker}</span>
                  <span>{signedPercent(signal.changePercent)}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="mt-4 border border-[var(--border-default)] rounded-[var(--radius-md)] p-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => onUpdateMode("analyst")}
            className={`rounded-[var(--radius-sm)] px-3 py-2 text-[13px] font-medium transition-colors ${
              profile.mode === "analyst"
                ? "bg-[var(--bg-inverse)] text-[var(--text-inverse)]"
                : "bg-transparent text-[var(--text-secondary)]"
            }`}
          >
            Analyst
          </button>
          <button
            type="button"
            onClick={() => onUpdateMode("explain")}
            className={`rounded-[var(--radius-sm)] px-3 py-2 text-[13px] font-medium transition-colors ${
              profile.mode === "explain"
                ? "bg-[var(--bg-inverse)] text-[var(--text-inverse)]"
                : "bg-transparent text-[var(--text-secondary)]"
            }`}
          >
            Simple
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenPortfolio}
        className="mt-3 self-start text-[12px] text-[var(--text-tertiary)] transition-colors duration-150 hover:text-[var(--text-primary)]"
      >
        Edit Portfolio
      </button>
    </div>
  );
}

function ChatPageContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, isOnboarded, isReady, saveProfile } = usePortfolio();
  const { messages, isLoading, currentSteps, sendMessage, clearChat } = useChat();
  const { speak, stop, isSpeaking } = useVoice();

  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [prices, setPrices] = useState<Record<string, StockSnapshot>>({});
  const [signals, setSignals] = useState<SidebarSignal[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [holdingsError, setHoldingsError] = useState<string | null>(null);
  const [hintIndex, setHintIndex] = useState(0);
  const [hintVisible, setHintVisible] = useState(true);
  const [showEmptyPrompts, setShowEmptyPrompts] = useState(false);
  const [mobilePortfolioOpen, setMobilePortfolioOpen] = useState(false);
  const [animatedMessageIds, setAnimatedMessageIds] = useState<string[]>([]);

  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const initializedMessageIdsRef = useRef(false);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isReady) return;
    if (!isOnboarded) router.replace("/");
  }, [isOnboarded, isReady, router]);

  useEffect(() => {
    const prefill = searchParams?.get("q");
    if (prefill && !messages.length) {
      setDraft(prefill);
    }
  }, [messages.length, searchParams]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const maxHeight = 5 * 24;
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [draft]);

  useEffect(() => {
    let timeoutId: number | null = null;

    const interval = window.setInterval(() => {
      setHintVisible(false);

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        setHintIndex((prev) => (prev + 1) % INPUT_HINTS.length);
        setHintVisible(true);
      }, 180);
    }, 8000);

    return () => {
      window.clearInterval(interval);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    if (messages.length !== 0) {
      setShowEmptyPrompts(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowEmptyPrompts(true);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [messages.length]);

  useEffect(() => {
    if (!profile?.holdings?.length) {
      setPrices({});
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
          const payload = (await response.json()) as { price: number; changePercent: number };
          return { ticker: holding.ticker, price: payload.price, changePercent: payload.changePercent };
        } catch {
          return null;
        }
      })
    )
      .then((rows) => {
        if (!mounted) return;
        const next: Record<string, StockSnapshot> = {};
        let failures = 0;

        for (const row of rows) {
          if (!row) {
            failures += 1;
            continue;
          }
          next[row.ticker.toUpperCase()] = {
            price: row.price,
            changePercent: row.changePercent,
          };
        }

        setPrices(next);
        if (failures > 0) {
          setHoldingsError("Some live prices are temporarily unavailable.");
        }
      })
      .finally(() => {
        if (mounted) {
          setHoldingsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [profile]);

  useEffect(() => {
    const baseUniverse = profile?.holdings?.map((holding) => holding.ticker.toUpperCase()) || [];
    const universe = Array.from(new Set([...baseUniverse, ...SIGNAL_UNIVERSE])).slice(0, 8);

    if (!universe.length) {
      setSignals([]);
      return;
    }

    let mounted = true;

    Promise.all(
      universe.map(async (ticker) => {
        try {
          const response = await fetch(`/api/stock?ticker=${encodeURIComponent(ticker)}`);
          if (!response.ok) return null;
          const payload = (await response.json()) as { price: number; changePercent: number };
          return {
            ticker,
            price: payload.price,
            changePercent: payload.changePercent,
          };
        } catch {
          return null;
        }
      })
    ).then((rows) => {
      if (!mounted) return;
      const cleaned = rows
        .filter((row): row is SidebarSignal => Boolean(row))
        .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
        .slice(0, 4);
      setSignals(cleaned);
    });

    return () => {
      mounted = false;
    };
  }, [profile]);

  useEffect(() => {
    const ids = messages.map((message) => message.id);

    if (!initializedMessageIdsRef.current) {
      initializedMessageIdsRef.current = true;
      seenMessageIdsRef.current = new Set(ids);
      return;
    }

    const newlyAdded = ids.filter((id) => !seenMessageIdsRef.current.has(id));
    if (newlyAdded.length === 0) return;

    for (const id of newlyAdded) {
      seenMessageIdsRef.current.add(id);
    }

    setAnimatedMessageIds((prev) => Array.from(new Set([...prev, ...newlyAdded])));

    const timeout = window.setTimeout(() => {
      setAnimatedMessageIds((prev) => prev.filter((id) => !newlyAdded.includes(id)));
    }, 230);

    return () => window.clearTimeout(timeout);
  }, [messages]);

  const hasSentMessage = useMemo(
    () => messages.some((message) => message.role === "user"),
    [messages]
  );

  const holdingsRows = useMemo(() => {
    if (!profile) return [];

    return profile.holdings.map((holding) => {
      const livePrice = prices[holding.ticker.toUpperCase()]?.price;
      const currentPrice = livePrice ?? holding.avgBuyPrice;
      const pnlPercent =
        holding.avgBuyPrice > 0
          ? ((currentPrice - holding.avgBuyPrice) / holding.avgBuyPrice) * 100
          : 0;

      return {
        ticker: holding.ticker.toUpperCase(),
        quantity: holding.quantity,
        currentPrice,
        pnlPercent,
        invested: holding.quantity * holding.avgBuyPrice,
        currentValue: holding.quantity * currentPrice,
      };
    });
  }, [prices, profile]);

  const totalValue = useMemo(
    () => holdingsRows.reduce((sum, row) => sum + row.currentValue, 0),
    [holdingsRows]
  );

  const totalChange = useMemo(() => {
    const invested = holdingsRows.reduce((sum, row) => sum + row.invested, 0);
    if (invested <= 0) return 0;
    return ((totalValue - invested) / invested) * 100;
  }, [holdingsRows, totalValue]);

  const knownTickers = useMemo(() => {
    const set = new Set<string>();
    for (const holding of profile?.holdings || []) {
      set.add(holding.ticker.toUpperCase());
    }
    for (const signal of signals) {
      set.add(signal.ticker.toUpperCase());
    }
    return set;
  }, [profile?.holdings, signals]);

  const activeTicker = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (message.role !== "user") continue;
      const ticker = findTicker(message.content, knownTickers);
      if (ticker) return ticker;
    }
    return null;
  }, [knownTickers, messages]);

  const activeTickerPrice = useMemo(() => {
    if (!activeTicker) return null;
    const fromHoldings = prices[activeTicker]?.price;
    if (typeof fromHoldings === "number") return fromHoldings;
    const signal = signals.find((item) => item.ticker === activeTicker);
    return signal?.price ?? null;
  }, [activeTicker, prices, signals]);

  const contextLabel = useMemo(() => {
    if (!activeTicker) return "Market Analysis";
    if (typeof activeTickerPrice !== "number") return activeTicker;
    return `${activeTicker} · ${formatRupee(activeTickerPrice, 2)}`;
  }, [activeTicker, activeTickerPrice]);

  useEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;

    const handleScroll = (): void => {
      const distanceToBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      shouldAutoScrollRef.current = distanceToBottom <= 100;
    };

    handleScroll();
    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    if (!shouldAutoScrollRef.current) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [isLoading, messages]);

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

  const updateMode = (mode: UserMode): void => {
    if (!profile || profile.mode === mode) return;
    saveProfile({ ...profile, mode });
  };

  return (
    <main className="h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="flex h-full">
        <aside className="hidden h-full w-[260px] shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] lg:block">
          <SidebarPanel
            profile={profile}
            holdingsRows={holdingsRows}
            totalValue={totalValue}
            totalChange={totalChange}
            holdingsLoading={holdingsLoading}
            holdingsError={holdingsError}
            signals={signals}
            onSignalClick={(ticker) => void handleSend(`Analyse ${ticker} for my portfolio`)}
            onUpdateMode={updateMode}
            onOpenPortfolio={() => router.push("/")}
          />
        </aside>

        <section className="relative flex min-h-0 flex-1 flex-col bg-[var(--bg-primary)]">
          <header className="flex h-[52px] items-center justify-between border-b border-[var(--border-subtle)] px-4 md:px-6">
            <p className="mono text-[13px] text-[var(--text-secondary)]">{contextLabel}</p>
            <button
              type="button"
              onClick={() => {
                clearChat();
                stop();
              }}
              className="text-[13px] text-[var(--text-tertiary)] transition-colors duration-150 hover:text-[var(--text-primary)]"
            >
              New chat
            </button>
          </header>

          <div ref={messagesViewportRef} className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[720px] px-6 py-6">
              {messages.length === 0 ? (
                <div className="fade-in flex min-h-[58vh] flex-col items-center justify-center text-center">
                  <p className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">InvestMitra</p>
                  <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
                    Your portfolio-aware market analyst.
                  </p>

                  <div
                    className={`mt-6 flex max-w-[620px] flex-wrap justify-center gap-2 transition-opacity duration-300 ${
                      showEmptyPrompts ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void handleSend(prompt)}
                        className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-[13px] text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-secondary)]"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  {messages.map((message, index) => {
                    const isLastAssistant =
                      message.role === "assistant" && index === messages.length - 1;

                    let previousUserMessage: string | null = null;
                    if (message.role === "assistant") {
                      for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
                        if (messages[cursor].role === "user") {
                          previousUserMessage = messages[cursor].content;
                          break;
                        }
                      }
                    }

                    return (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        isLoading={isLoading && isLastAssistant}
                        activeSteps={isLoading && isLastAssistant ? currentSteps : message.steps || []}
                        onSpeak={speak}
                        onStopSpeaking={stop}
                        isSpeaking={isSpeaking}
                        onRetry={
                          previousUserMessage
                            ? () => {
                                void handleSend(previousUserMessage || "");
                              }
                            : undefined
                        }
                        animate={animatedMessageIds.includes(message.id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mb-[56px] shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-4 md:mb-0 md:px-6">
            <div className="mx-auto w-full max-w-[720px]">
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  hasSentMessage ? "mb-0 max-h-0 opacity-0" : "mb-3 max-h-40 opacity-100"
                }`}
              >
                <div className="flex flex-wrap gap-2">
                  {PROMPTS.map((prompt) => (
                    <button
                      key={`input-${prompt}`}
                      type="button"
                      onClick={() => void handleSend(prompt)}
                      className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-[13px] text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-secondary)]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSend(draft);
                }}
              >
                <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 transition-colors duration-150 focus-within:border-[var(--border-strong)]">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void handleSend(draft);
                      }
                    }}
                    placeholder="Ask about your portfolio..."
                    className="max-h-[120px] w-full resize-none overflow-hidden border-none bg-transparent p-0 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                  />

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p
                      className={`text-[12px] italic text-[var(--text-tertiary)] transition-opacity duration-200 ${
                        hintVisible ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {INPUT_HINTS[hintIndex]}
                    </p>

                    <button
                      type="submit"
                      disabled={!draft.trim() || pending || isLoading}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-inverse)] transition-colors duration-150 ${
                        draft.trim() && !pending && !isLoading
                          ? "bg-[var(--bg-inverse)]"
                          : "bg-[var(--bg-tertiary)]"
                      }`}
                      aria-label="Send"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 grid h-[56px] grid-cols-3 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] md:hidden">
        <button
          type="button"
          onClick={() => setMobilePortfolioOpen(false)}
          className={`text-[13px] transition-colors duration-150 ${
            !mobilePortfolioOpen
              ? "font-semibold text-[var(--text-primary)]"
              : "text-[var(--text-tertiary)]"
          }`}
        >
          Chat
        </button>
        <button
          type="button"
          onClick={() => setMobilePortfolioOpen((prev) => !prev)}
          className={`text-[13px] transition-colors duration-150 ${
            mobilePortfolioOpen
              ? "font-semibold text-[var(--text-primary)]"
              : "text-[var(--text-tertiary)]"
          }`}
        >
          Portfolio
        </button>
        <button
          type="button"
          onClick={() => router.push("/signals")}
          className="text-[13px] text-[var(--text-tertiary)] transition-colors duration-150 hover:text-[var(--text-primary)]"
        >
          Signals
        </button>
      </nav>

      {mobilePortfolioOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close portfolio drawer"
            className="absolute inset-0 bg-black/10"
            onClick={() => setMobilePortfolioOpen(false)}
          />
          <div className="absolute bottom-[56px] left-0 right-0 h-[60vh] rounded-t-[var(--radius-lg)] border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[var(--border-default)]" />
            <SidebarPanel
              profile={profile}
              holdingsRows={holdingsRows}
              totalValue={totalValue}
              totalChange={totalChange}
              holdingsLoading={holdingsLoading}
              holdingsError={holdingsError}
              signals={signals}
              onSignalClick={(ticker) => {
                setMobilePortfolioOpen(false);
                void handleSend(`Analyse ${ticker} for my portfolio`);
              }}
              onUpdateMode={updateMode}
              onOpenPortfolio={() => {
                setMobilePortfolioOpen(false);
                router.push("/");
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}

export default function ChatPage(): React.JSX.Element {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[var(--bg-primary)]" />}>
      <ChatPageContent />
    </Suspense>
  );
}
