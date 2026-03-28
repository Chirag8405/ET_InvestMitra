"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import { useRouter } from "next/navigation";

import { usePortfolio } from "../hooks/usePortfolio";
import type { Holding, RiskProfile, UserMode, UserProfile } from "../types";

const AGE_OPTIONS: Array<{ value: UserProfile["ageGroup"]; label: string; description: string }> = [
  { value: "18-25", label: "18-25", description: "Early-stage compounding" },
  { value: "26-35", label: "26-35", description: "Growth with risk discipline" },
  { value: "36-50", label: "36-50", description: "Balanced capital growth" },
  { value: "50+", label: "50+", description: "Capital protection priority" },
];

const RISK_OPTIONS: Array<{ value: RiskProfile; label: string; description: string }> = [
  { value: "conservative", label: "Conservative", description: "Lower drawdown preference" },
  { value: "moderate", label: "Moderate", description: "Balanced risk-reward" },
  { value: "aggressive", label: "Aggressive", description: "Higher volatility tolerance" },
];

const GOAL_OPTIONS: Array<{
  value: UserProfile["investmentGoal"];
  label: string;
  description: string;
}> = [
  { value: "wealth_creation", label: "Wealth creation", description: "Long-term equity compounding" },
  { value: "retirement", label: "Retirement", description: "Stability across market cycles" },
  { value: "short_term", label: "Short term", description: "Tactical opportunities" },
  { value: "income", label: "Income", description: "Cash-flow-focused portfolio" },
];

const MODE_OPTIONS: Array<{ value: UserMode; label: string; description: string }> = [
  { value: "analyst", label: "Analyst", description: "Deep market context and rigor" },
  { value: "explain", label: "Simple", description: "Plain-English decisions" },
];

const TICKER_SECTOR_MAP: Record<string, string> = {
  RELIANCE: "Energy",
  TCS: "Information Technology",
  INFY: "Information Technology",
  HDFCBANK: "Banking",
  ICICIBANK: "Banking",
  SBIN: "Banking",
  ITC: "Consumer Staples",
  LT: "Industrials",
  AXISBANK: "Banking",
  KOTAKBANK: "Banking",
  BAJFINANCE: "Financial Services",
  BHARTIARTL: "Telecom",
  HINDUNILVR: "Consumer Staples",
  MARUTI: "Automobile",
  SUNPHARMA: "Pharmaceuticals",
  TITAN: "Consumer Discretionary",
  ASIANPAINT: "Materials",
  NESTLEIND: "Consumer Staples",
  WIPRO: "Information Technology",
  ULTRACEMCO: "Materials",
};

const EMPTY_HOLDING: Holding = {
  ticker: "",
  quantity: 0,
  avgBuyPrice: 0,
  sector: "",
};

function modeLabel(mode: UserMode): string {
  return mode === "analyst" ? "Analyst mode" : "Simple mode";
}

function OptionButton({
  selected,
  label,
  description,
  onClick,
}: {
  selected: boolean;
  label: string;
  description: string;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors duration-100 ${
        selected
          ? "border-[var(--text-primary)] bg-[var(--bg-secondary)]"
          : "border-[var(--border-default)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)]"
      }`}
    >
      <p className={`text-[14px] ${selected ? "font-semibold" : "font-medium"} text-[var(--text-primary)]`}>
        {label}
      </p>
      <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{description}</p>
    </button>
  );
}

export default function Home(): JSX.Element {
  const router = useRouter();
  const { isOnboarded, isReady, saveProfile } = usePortfolio();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [previousStep, setPreviousStep] = useState<1 | 2 | 3 | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<number | null>(null);

  const [ageGroup, setAgeGroup] = useState<UserProfile["ageGroup"] | null>(null);
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);
  const [investmentGoal, setInvestmentGoal] = useState<UserProfile["investmentGoal"] | null>(null);
  const [mode, setMode] = useState<UserMode | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([{ ...EMPTY_HOLDING }]);

  useEffect(() => {
    if (!isReady) return;
    if (isOnboarded) {
      router.replace("/chat");
    }
  }, [isOnboarded, isReady, router]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const transitionTo = (nextStep: 1 | 2 | 3): void => {
    if (nextStep === step) return;

    setPreviousStep(step);
    setStep(nextStep);
    setTransitioning(true);

    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current);
    }

    transitionTimeoutRef.current = window.setTimeout(() => {
      setPreviousStep(null);
      setTransitioning(false);
      transitionTimeoutRef.current = null;
    }, 250);
  };

  const step1Stage = useMemo<"age" | "risk" | "goal" | "mode">(() => {
    if (!ageGroup) return "age";
    if (!riskProfile) return "risk";
    if (!investmentGoal) return "goal";
    return "mode";
  }, [ageGroup, investmentGoal, riskProfile]);

  const step1Meta = useMemo(() => {
    if (step1Stage === "age") {
      return {
        heading: "Let us start with your age range",
        subheading: "This helps calibrate investment horizon and drawdown tolerance.",
        options: AGE_OPTIONS,
        selected: ageGroup,
        onSelect: (value: string) => setAgeGroup(value as UserProfile["ageGroup"]),
      };
    }

    if (step1Stage === "risk") {
      return {
        heading: "How much volatility are you comfortable with?",
        subheading: "Risk preference changes position sizing and conviction thresholds.",
        options: RISK_OPTIONS,
        selected: riskProfile,
        onSelect: (value: string) => setRiskProfile(value as RiskProfile),
      };
    }

    if (step1Stage === "goal") {
      return {
        heading: "What is your primary investment goal?",
        subheading: "Your objective defines whether we optimize growth or protection.",
        options: GOAL_OPTIONS,
        selected: investmentGoal,
        onSelect: (value: string) => setInvestmentGoal(value as UserProfile["investmentGoal"]),
      };
    }

    return {
      heading: "Choose your analysis style",
      subheading: "You can switch modes later from chat sidebar anytime.",
      options: MODE_OPTIONS,
      selected: mode,
      onSelect: (value: string) => setMode(value as UserMode),
    };
  }, [ageGroup, investmentGoal, mode, riskProfile, step1Stage]);

  const canContinueStep1 = Boolean(ageGroup && riskProfile && investmentGoal && mode);

  const sanitizedHoldings = useMemo(
    () =>
      holdings.filter(
        (holding) =>
          holding.ticker.trim().length > 0 &&
          holding.quantity > 0 &&
          holding.avgBuyPrice > 0 &&
          holding.sector.trim().length > 0
      ),
    [holdings]
  );

  const summary = useMemo(() => {
    const totalInvested = sanitizedHoldings.reduce(
      (sum, holding) => sum + holding.quantity * holding.avgBuyPrice,
      0
    );

    const sectorMap = new Map<string, number>();
    for (const holding of sanitizedHoldings) {
      const value = holding.quantity * holding.avgBuyPrice;
      sectorMap.set(holding.sector, (sectorMap.get(holding.sector) || 0) + value);
    }

    const sectors = Array.from(sectorMap.entries())
      .map(([sector, value]) => ({
        sector,
        percent: totalInvested > 0 ? (value / totalInvested) * 100 : 0,
      }))
      .sort((a, b) => b.percent - a.percent);

    return {
      totalInvested,
      topSector: sectors[0]?.sector || "Unassigned",
      topSectorPercent: sectors[0]?.percent || 0,
      holdingCount: sanitizedHoldings.length,
    };
  }, [sanitizedHoldings]);

  const updateHolding = (index: number, patch: Partial<Holding>): void => {
    setHoldings((prev) =>
      prev.map((holding, rowIndex) => {
        if (rowIndex !== index) return holding;

        const next = { ...holding, ...patch };
        if (patch.ticker !== undefined) {
          const normalized = patch.ticker.toUpperCase().replace(/[^A-Z0-9]/g, "");
          next.ticker = normalized;
          const inferredSector = TICKER_SECTOR_MAP[normalized];
          if (inferredSector) next.sector = inferredSector;
        }

        return next;
      })
    );
  };

  const createProfilePayload = (): UserProfile | null => {
    if (!ageGroup || !riskProfile || !investmentGoal || !mode) return null;

    return {
      holdings: sanitizedHoldings,
      ageGroup,
      riskProfile,
      investmentGoal,
      mode,
      onboarded: true,
    };
  };

  const handleFinish = (): void => {
    const payload = createProfilePayload();
    if (!payload) return;
    saveProfile(payload);
    router.push("/chat");
  };

  const renderStep = (target: 1 | 2 | 3): JSX.Element => {
    if (target === 1) {
      return (
        <section>
          <h1>{step1Meta.heading}</h1>
          <p className="mt-2 mb-8 text-[15px] text-[var(--text-secondary)]">{step1Meta.subheading}</p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {step1Meta.options.map((option) => (
              <OptionButton
                key={option.value}
                selected={step1Meta.selected === option.value}
                label={option.label}
                description={option.description}
                onClick={() => step1Meta.onSelect(option.value)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => transitionTo(2)}
            className={`mt-8 h-11 w-full rounded-[var(--radius-md)] bg-[var(--bg-inverse)] text-[15px] font-medium text-[var(--text-inverse)] transition-opacity duration-150 ${
              canContinueStep1 ? "fade-in opacity-100 hover:opacity-85" : "pointer-events-none opacity-0"
            }`}
          >
            Continue →
          </button>
        </section>
      );
    }

    if (target === 2) {
      return (
        <section>
          <h1>Add Your Holdings</h1>
          <p className="mt-2 mb-8 text-[15px] text-[var(--text-secondary)]">
            Optional, but this unlocks portfolio-aware analysis immediately.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-left">
                  <th className="px-1 py-2 text-[12px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Ticker</th>
                  <th className="px-1 py-2 text-[12px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Quantity</th>
                  <th className="px-1 py-2 text-[12px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Avg Buy</th>
                  <th className="px-1 py-2 text-[12px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Sector</th>
                  <th className="w-8 px-1 py-2 text-right text-[12px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]"> </th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding, index) => (
                  <tr key={index} className="group border-b border-[var(--border-subtle)] text-[14px]">
                    <td className="px-1 py-2">
                      <input
                        value={holding.ticker}
                        onChange={(event) => updateHolding(index, { ticker: event.target.value })}
                        placeholder="RELIANCE"
                        className="w-full border-b border-transparent bg-transparent px-0 py-1 text-[14px] outline-none focus:border-[var(--text-primary)]"
                      />
                    </td>
                    <td className="px-1 py-2">
                      <input
                        type="number"
                        min={0}
                        value={holding.quantity || ""}
                        onChange={(event) =>
                          updateHolding(index, { quantity: Number(event.target.value) || 0 })
                        }
                        className="mono w-full border-b border-transparent bg-transparent px-0 py-1 text-[14px] outline-none focus:border-[var(--text-primary)]"
                      />
                    </td>
                    <td className="px-1 py-2">
                      <input
                        type="number"
                        min={0}
                        value={holding.avgBuyPrice || ""}
                        onChange={(event) =>
                          updateHolding(index, { avgBuyPrice: Number(event.target.value) || 0 })
                        }
                        className="mono w-full border-b border-transparent bg-transparent px-0 py-1 text-[14px] outline-none focus:border-[var(--text-primary)]"
                      />
                    </td>
                    <td className="px-1 py-2">
                      <input
                        value={holding.sector}
                        onChange={(event) => updateHolding(index, { sector: event.target.value })}
                        placeholder="Banking"
                        className="w-full border-b border-transparent bg-transparent px-0 py-1 text-[14px] outline-none focus:border-[var(--text-primary)]"
                      />
                    </td>
                    <td className="px-1 py-2 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setHoldings((prev) =>
                            prev.length === 1 ? prev : prev.filter((_, rowIndex) => rowIndex !== index)
                          )
                        }
                        className="text-[13px] text-[var(--text-tertiary)] opacity-0 transition-colors duration-100 group-hover:opacity-100 hover:text-[var(--accent-negative)]"
                        aria-label="Delete holding row"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => setHoldings((prev) => [...prev, { ...EMPTY_HOLDING }])}
            className="mt-3 text-[13px] text-[var(--text-tertiary)] transition-colors duration-100 hover:text-[var(--text-primary)]"
          >
            + Add holding
          </button>

          <div className="mt-8 space-y-2">
            <button
              type="button"
              onClick={() => transitionTo(3)}
              className="h-11 w-full rounded-[var(--radius-md)] bg-[var(--bg-inverse)] text-[15px] font-medium text-[var(--text-inverse)] transition-opacity duration-150 hover:opacity-85"
            >
              Continue →
            </button>
            <button
              type="button"
              onClick={() => transitionTo(1)}
              className="w-full text-[13px] text-[var(--text-tertiary)] transition-colors duration-100 hover:text-[var(--text-primary)]"
            >
              Back
            </button>
          </div>
        </section>
      );
    }

    return (
      <section>
        <h1>Profile Ready</h1>
        <p className="mt-2 mb-8 text-[15px] text-[var(--text-secondary)]">
          InvestMitra will use this baseline for every response.
        </p>

        <div className="space-y-3 border-y border-[var(--border-subtle)] py-4">
          <p className="text-[14px] text-[var(--text-secondary)]">
            Holdings tracked: <span className="mono text-[var(--text-primary)]">{summary.holdingCount}</span>
          </p>
          <p className="text-[14px] text-[var(--text-secondary)]">
            Total invested: <span className="mono text-[var(--text-primary)]">\u20B9{summary.totalInvested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
          </p>
          <p className="text-[14px] text-[var(--text-secondary)]">
            Top sector: <span className="mono text-[var(--text-primary)]">{Math.round(summary.topSectorPercent)}% {summary.topSector}</span>
          </p>
          <p className="text-[14px] text-[var(--text-secondary)]">
            Mode: <span className="text-[var(--text-primary)]">{modeLabel(mode || "analyst")}</span>
          </p>
        </div>

        <div className="mt-8 space-y-2">
          <button
            type="button"
            onClick={handleFinish}
            className="h-11 w-full rounded-[var(--radius-md)] bg-[var(--bg-inverse)] text-[15px] font-medium text-[var(--text-inverse)] transition-opacity duration-150 hover:opacity-85"
          >
            Continue →
          </button>
          <button
            type="button"
            onClick={() => transitionTo(2)}
            className="w-full text-[13px] text-[var(--text-tertiary)] transition-colors duration-100 hover:text-[var(--text-primary)]"
          >
            Back
          </button>
        </div>
      </section>
    );
  };

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] px-4 py-8 text-[var(--text-primary)]">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[480px] items-center">
        <div className="w-full">
          <div className="mb-6 flex items-center justify-center gap-2">
            {[1, 2, 3].map((dot) => (
              <span
                key={dot}
                className="h-[6px] w-[6px] rounded-full transition-colors duration-300"
                style={{
                  backgroundColor:
                    dot === step ? "var(--text-primary)" : "var(--border-default)",
                }}
              />
            ))}
          </div>

          <div className="relative overflow-hidden">
            {transitioning && previousStep ? (
              <div className="pointer-events-none absolute inset-0 step-exit">{renderStep(previousStep)}</div>
            ) : null}
            <div className={transitioning ? "step-enter" : ""}>{renderStep(step)}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
