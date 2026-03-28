"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const TICKERS = [
  "RELIANCE",
  "HDFCBANK",
  "TCS",
  "INFY",
  "ICICIBANK",
  "WIPRO",
  "ADANIPORTS",
  "TATAMOTORS",
  "BAJFINANCE",
  "SBIN",
  "AXISBANK",
  "MARUTI",
  "ASIANPAINT",
  "NESTLEIND",
  "HINDUNILVR",
] as const;

type StockPayload = {
  ticker: string;
  price: number;
  changePercent: number;
};

type ScreenerPayload = {
  pe: number | null;
};

type SignalRow = {
  ticker: string;
  price: number | null;
  changePercent: number | null;
  pe: number | null;
  signal: "MOMENTUM" | "OVERSOLD DIP" | "EXPENSIVE" | "NEUTRAL";
  strength: 1 | 2 | 3;
  error?: string;
};

function deriveSignal(changePercent: number | null, pe: number | null): SignalRow["signal"] {
  if (changePercent !== null && pe !== null && changePercent > 2 && pe < 25) return "MOMENTUM";
  if (changePercent !== null && pe !== null && changePercent < -2 && pe < 20) return "OVERSOLD DIP";
  if (pe !== null && pe > 40) return "EXPENSIVE";
  return "NEUTRAL";
}

function strengthBars(changePercent: number | null): 1 | 2 | 3 {
  if (changePercent === null) return 1;
  const mag = Math.abs(changePercent);
  if (mag >= 3) return 3;
  if (mag >= 1) return 2;
  return 1;
}

function signalClass(signal: SignalRow["signal"]): string {
  if (signal === "MOMENTUM" || signal === "OVERSOLD DIP") return "text-black";
  if (signal === "EXPENSIVE") return "text-zinc-600";
  return "text-zinc-400";
}

function TableSkeleton(): React.JSX.Element {
  return (
    <tbody>
      {Array.from({ length: 8 }).map((_, idx) => (
        <tr key={idx} className="border-b border-zinc-200">
          {Array.from({ length: 6 }).map((__, cell) => (
            <td key={cell} className="px-3 py-3">
              <div className="h-4 w-20 animate-pulse bg-zinc-200" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export default function SignalsPage(): React.JSX.Element {
  const router = useRouter();
  const [rows, setRows] = useState<SignalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inlineError, setInlineError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setInlineError(null);

    Promise.all(
      TICKERS.map(async (ticker): Promise<SignalRow> => {
        const [stockResult, screenerResult] = await Promise.all([
          fetch(`/api/stock?ticker=${encodeURIComponent(ticker)}`)
            .then(async (res) => {
              if (!res.ok) throw new Error("Stock fetch failed");
              return (await res.json()) as StockPayload;
            })
            .catch(() => null),
          fetch(`/api/screener?ticker=${encodeURIComponent(ticker)}`)
            .then(async (res) => {
              if (!res.ok) throw new Error("Screener fetch failed");
              return (await res.json()) as ScreenerPayload;
            })
            .catch(() => null),
        ]);

        const changePercent = stockResult?.changePercent ?? null;
        const pe = screenerResult?.pe ?? null;

        return {
          ticker,
          price: stockResult?.price ?? null,
          changePercent,
          pe,
          signal: deriveSignal(changePercent, pe),
          strength: strengthBars(changePercent),
          error: !stockResult || !screenerResult ? "Partial data unavailable" : undefined,
        };
      })
    )
      .then((nextRows) => {
        if (!mounted) return;
        setRows(nextRows);
        if (nextRows.some((row) => row.error)) {
          setInlineError("Some rows have partial data due to temporary API failures.");
        }
      })
      .catch(() => {
        if (!mounted) return;
        setInlineError("Unable to load top signals right now.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const sortedRows = useMemo(
    () => rows.slice().sort((a, b) => (b.changePercent ?? -999) - (a.changePercent ?? -999)),
    [rows]
  );

  return (
    <main
      className="min-h-screen bg-white px-4 py-8 text-zinc-900 sm:px-6"
      style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.08em] text-zinc-600 uppercase">InvestMitra</p>
            <h1 className="mt-1 text-2xl font-semibold text-black">Top Signals Dashboard</h1>
            <p className="mt-2 text-sm text-zinc-600">Live scan across 15 high-liquidity NSE names.</p>
          </div>
          <Link href="/chat" className="border border-zinc-400 px-3 py-2 text-sm hover:border-black">
            Back to Chat
          </Link>
        </div>

        {inlineError && <p className="mb-3 text-sm text-zinc-600">{inlineError}</p>}

        <div className="overflow-x-auto border border-zinc-300">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead className="bg-zinc-100">
              <tr>
                <th className="px-3 py-3 text-left font-medium">Ticker</th>
                <th className="px-3 py-3 text-left font-medium">Price</th>
                <th className="px-3 py-3 text-left font-medium">Change%</th>
                <th className="px-3 py-3 text-left font-medium">PE</th>
                <th className="px-3 py-3 text-left font-medium">Signal</th>
                <th className="px-3 py-3 text-left font-medium">Strength</th>
              </tr>
            </thead>

            {loading ? (
              <TableSkeleton />
            ) : (
              <tbody>
                {sortedRows.map((row) => (
                  <tr
                    key={row.ticker}
                    className="cursor-pointer border-b border-zinc-200 hover:bg-zinc-50"
                    onClick={() => router.push(`/chat?q=${encodeURIComponent(`Analyse ${row.ticker} for my portfolio`)}`)}
                  >
                    <td className="px-3 py-3 font-medium text-black">{row.ticker}</td>
                    <td className="px-3 py-3">{row.price === null ? "--" : row.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-3">
                      {row.changePercent === null
                        ? "--"
                        : `${row.changePercent > 0 ? "+" : ""}${row.changePercent.toFixed(2)}%`}
                    </td>
                    <td className="px-3 py-3">{row.pe === null ? "null" : row.pe.toFixed(1)}</td>
                    <td className={`px-3 py-3 font-medium ${signalClass(row.signal)}`}>{row.signal}</td>
                    <td className="px-3 py-3 font-mono text-black">{"|".repeat(row.strength)}</td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      </div>
    </main>
  );
}
