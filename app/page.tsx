"use client";

import { useMemo, useState, useEffect } from "react";
import type { JSX } from "react";
import { useRouter } from "next/navigation";

import { PortfolioDNA } from "../components/PortfolioDNA";
import { usePortfolio } from "../hooks/usePortfolio";
import type { Holding, RiskProfile, UserMode, UserProfile } from "../types";

const AGE_GROUPS: UserProfile["ageGroup"][] = ["18-25", "26-35", "36-50", "50+"];
const RISK_OPTIONS: RiskProfile[] = ["conservative", "moderate", "aggressive"];
const GOAL_OPTIONS: UserProfile["investmentGoal"][] = [
  "wealth_creation",
  "retirement",
  "short_term",
  "income",
];

const MODE_OPTIONS: Array<{ label: string; value: UserMode; description: string }> = [
  { label: "Like a professional", value: "analyst", description: "Detailed market-style analysis" },
  { label: "In plain English", value: "explain", description: "Simple explanations without jargon" },
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

function OptionButton({
  selected,
  label,
  description,
  onClick,
}: {
  selected: boolean;
  label: string;
  description?: string;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full border px-4 py-3 text-left transition-colors ${
        selected
          ? "border-black bg-black text-white"
          : "border-zinc-400 bg-white text-zinc-900 hover:border-black"
      }`}
    >
      <p className="text-sm font-medium">{label}</p>
      {description ? <p className="mt-1 text-xs opacity-80">{description}</p> : null}
    </button>
  );
}

export default function Home(): JSX.Element {
  const router = useRouter();
  const { isOnboarded, isReady, saveProfile } = usePortfolio();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [ageGroup, setAgeGroup] = useState<UserProfile["ageGroup"] | null>(null);
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);
  const [investmentGoal, setInvestmentGoal] =
    useState<UserProfile["investmentGoal"] | null>(null);
  const [mode, setMode] = useState<UserMode | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([{ ...EMPTY_HOLDING }]);

  useEffect(() => {
    if (!isReady) return;
    if (isOnboarded) {
      router.replace("/chat");
    }
  }, [isOnboarded, isReady, router]);

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
        value,
        percent: totalInvested > 0 ? (value / totalInvested) * 100 : 0,
      }))
      .sort((a, b) => b.percent - a.percent);

    return {
      totalInvested,
      topSector: sectors[0]?.sector || "N/A",
      topSectorPercent: sectors[0]?.percent || 0,
      count: sanitizedHoldings.length,
    };
  }, [sanitizedHoldings]);

  const updateHolding = (index: number, patch: Partial<Holding>): void => {
    setHoldings((prev) =>
      prev.map((holding, rowIndex) => {
        if (rowIndex !== index) return holding;

        const next = { ...holding, ...patch };
        if (patch.ticker !== undefined) {
          const normalizedTicker = patch.ticker.toUpperCase().replace(/[^A-Z0-9]/g, "");
          next.ticker = normalizedTicker;
          const inferredSector = TICKER_SECTOR_MAP[normalizedTicker];
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
      riskProfile,
      ageGroup,
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

  return (
    <main
      className="min-h-screen bg-white px-4 py-8 text-zinc-900 sm:px-8"
      style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}
    >
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-8 flex items-center justify-center gap-3">
          {[1, 2, 3].map((dot) => {
            const completed = dot < step;
            const current = dot === step;
            return (
              <span
                key={dot}
                className={`h-2.5 w-2.5 rounded-full border ${
                  completed || current ? "border-black bg-black" : "border-zinc-500 bg-white"
                }`}
              />
            );
          })}
        </div>

        {step === 1 && (
          <section className="space-y-6 border border-zinc-300 p-5 sm:p-8">
            <header>
              <p className="text-xs tracking-[0.08em] text-zinc-600 uppercase">Step 1</p>
              <h1 className="mt-1 text-2xl font-semibold text-black">About You (30 seconds)</h1>
            </header>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium">How old are you?</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {AGE_GROUPS.map((option) => (
                    <OptionButton
                      key={option}
                      label={option}
                      selected={ageGroup === option}
                      onClick={() => setAgeGroup(option)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Your risk appetite?</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {RISK_OPTIONS.map((option) => (
                    <OptionButton
                      key={option}
                      label={option.charAt(0).toUpperCase() + option.slice(1)}
                      selected={riskProfile === option}
                      onClick={() => setRiskProfile(option)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Primary investment goal?</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {GOAL_OPTIONS.map((option) => (
                    <OptionButton
                      key={option}
                      label={option.replaceAll("_", " ")}
                      selected={investmentGoal === option}
                      onClick={() => setInvestmentGoal(option)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">How do you prefer analysis?</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {MODE_OPTIONS.map((option) => (
                    <OptionButton
                      key={option.value}
                      label={option.label}
                      description={option.description}
                      selected={mode === option.value}
                      onClick={() => setMode(option.value)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!canContinueStep1}
              className="w-full border border-black bg-black px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:border-zinc-400 disabled:bg-zinc-300"
            >
              Continue to holdings
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6 border border-zinc-300 p-5 sm:p-8">
            <header>
              <p className="text-xs tracking-[0.08em] text-zinc-600 uppercase">Step 2</p>
              <h2 className="mt-1 text-2xl font-semibold text-black">Your Holdings (optional but recommended)</h2>
            </header>

            <div className="overflow-x-auto border border-zinc-300">
              <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead className="bg-zinc-100 text-zinc-800">
                  <tr>
                    <th className="border-b border-zinc-300 px-3 py-2 text-left font-medium">Ticker</th>
                    <th className="border-b border-zinc-300 px-3 py-2 text-left font-medium">Quantity</th>
                    <th className="border-b border-zinc-300 px-3 py-2 text-left font-medium">Average buy price</th>
                    <th className="border-b border-zinc-300 px-3 py-2 text-left font-medium">Sector</th>
                    <th className="border-b border-zinc-300 px-3 py-2 text-center font-medium">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding, index) => (
                    <tr key={index} className="bg-white">
                      <td className="border-b border-zinc-200 px-3 py-2">
                        <input
                          value={holding.ticker}
                          onChange={(e) => updateHolding(index, { ticker: e.target.value })}
                          placeholder="RELIANCE"
                          className="w-full border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-black"
                        />
                      </td>
                      <td className="border-b border-zinc-200 px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          value={holding.quantity || ""}
                          onChange={(e) => updateHolding(index, { quantity: Number(e.target.value) || 0 })}
                          className="w-full border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-black"
                        />
                      </td>
                      <td className="border-b border-zinc-200 px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          value={holding.avgBuyPrice || ""}
                          onChange={(e) =>
                            updateHolding(index, { avgBuyPrice: Number(e.target.value) || 0 })
                          }
                          className="w-full border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-black"
                        />
                      </td>
                      <td className="border-b border-zinc-200 px-3 py-2">
                        <input
                          value={holding.sector}
                          onChange={(e) => updateHolding(index, { sector: e.target.value })}
                          placeholder="Banking"
                          className="w-full border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-black"
                        />
                      </td>
                      <td className="border-b border-zinc-200 px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setHoldings((prev) =>
                              prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
                            )
                          }
                          className="border border-zinc-400 px-2 py-1 text-xs text-zinc-700 hover:border-black hover:text-black"
                          aria-label="Delete row"
                        >
                          X
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setHoldings((prev) => [...prev, { ...EMPTY_HOLDING }])}
                className="border border-zinc-700 px-4 py-2 text-sm text-zinc-900 hover:border-black"
              >
                Add Row
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-sm text-zinc-700 underline underline-offset-4 hover:text-black"
              >
                Skip for now
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="border border-zinc-700 bg-white px-4 py-2 text-sm text-zinc-900"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="border border-black bg-black px-4 py-2 text-sm text-white"
              >
                Continue
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-6 border border-zinc-300 p-5 sm:p-8">
            <header>
              <p className="text-xs tracking-[0.08em] text-zinc-600 uppercase">Step 3</p>
              <h2 className="mt-1 text-2xl font-semibold text-black">Your AI analyst is ready</h2>
            </header>

            <div className="border border-zinc-300 p-5">
              <p className="text-lg font-medium text-black">
                {summary.count} holdings | ₹
                {summary.totalInvested.toLocaleString("en-IN", { maximumFractionDigits: 0 })} total invested |{" "}
                {Math.round(summary.topSectorPercent)}% in {summary.topSector}
              </p>
              <p className="mt-2 text-sm text-zinc-600">
                Risk: {riskProfile || "-"} | Goal: {investmentGoal?.replaceAll("_", " ") || "-"} | Mode: {mode || "-"}
              </p>
            </div>

            <PortfolioDNA holdings={sanitizedHoldings} />

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="border border-zinc-700 bg-white px-4 py-2 text-sm text-zinc-900"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="border border-black bg-black px-5 py-3 text-sm font-medium text-white"
              >
                Start Analysing Markets
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
