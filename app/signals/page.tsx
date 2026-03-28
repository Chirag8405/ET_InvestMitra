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
};

function deriveSignal(changePercent: number | null, pe: number | null): SignalRow["signal"] {
  if (changePercent !== null && pe !== null && changePercent > 2 && pe < 25) return "MOMENTUM";
  if (changePercent !== null && pe !== null && changePercent < -2 && pe < 20) return "OVERSOLD DIP";
  if (pe !== null && pe > 40) return "EXPENSIVE";
  return "NEUTRAL";
}

function signalStyle(signal: SignalRow["signal"]): string {
  if (signal === "MOMENTUM") {
    return "border-[var(--accent-positive)] text-[var(--accent-positive)]";
  }
  if (signal === "OVERSOLD DIP") {
    return "border-[var(--accent-neutral)] text-[var(--accent-neutral)]";
  }
  if (signal === "EXPENSIVE") {
    return "border-[var(--border-default)] text-[var(--text-tertiary)]";
  }
  return "border-transparent text-[var(--text-tertiary)]";
}

function signedPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function changeColor(value: number): string {
  if (value > 0) return "finance-positive";
  if (value < 0) return "finance-negative";
  return "finance-neutral";
}

function TableSkeleton(): React.JSX.Element {
  return (
    <tbody>
      {Array.from({ length: 10 }).map((_, row) => (
        <tr key={row} className="border-b border-[var(--border-subtle)]">
          <td className="px-3 py-4"><div className="skeleton w-16" /></td>
          <td className="px-3 py-4 text-right"><div className="skeleton ml-auto w-20" /></td>
          <td className="px-3 py-4 text-right"><div className="skeleton ml-auto w-16" /></td>
          <td className="px-3 py-4 text-right"><div className="skeleton ml-auto w-12" /></td>
          <td className="px-3 py-4 text-center"><div className="skeleton mx-auto w-24" /></td>
          <td className="px-3 py-4 text-center"><div className="skeleton mx-auto w-14" /></td>
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
  const [updatedAt, setUpdatedAt] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setInlineError(null);

    Promise.all(
      TICKERS.map(async (ticker): Promise<SignalRow> => {
        const [stockResult, screenerResult] = await Promise.all([
          fetch(`/api/stock?ticker=${encodeURIComponent(ticker)}`)
            .then(async (response) => {
              if (!response.ok) throw new Error("Stock fetch failed");
              return (await response.json()) as StockPayload;
            })
            .catch(() => null),
          fetch(`/api/screener?ticker=${encodeURIComponent(ticker)}`)
            .then(async (response) => {
              if (!response.ok) throw new Error("Screener fetch failed");
              return (await response.json()) as ScreenerPayload;
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
        };
      })
    )
      .then((nextRows) => {
        if (!mounted) return;
        setRows(nextRows);
        if (nextRows.some((row) => row.price === null || row.pe === null)) {
          setInlineError("Some rows are missing live values due to temporary API limits.");
        }
        setUpdatedAt(
          new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      })
      .catch(() => {
        if (!mounted) return;
        setInlineError("Unable to load market signals right now.");
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
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="px-4 pt-8 md:px-12">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1>Market Signals</h1>
            <p className="mono mt-2 text-[13px] text-[var(--text-secondary)]">
              NSE — updated {updatedAt || "--:--"}
            </p>
          </div>
          <Link
            href="/chat"
            className="text-[13px] text-[var(--text-tertiary)] transition-colors duration-150 hover:text-[var(--text-primary)]"
          >
            Back to chat
          </Link>
        </div>

        {inlineError && (
          <p className="mt-3 text-[12px] text-[var(--text-tertiary)]">{inlineError}</p>
        )}
      </div>

      <div className="px-4 pb-8 pt-6 md:px-12">
        <div className="overflow-auto">
          <table className="w-full min-w-[880px] border-collapse">
            <thead className="sticky top-0 bg-[var(--bg-primary)]">
              <tr className="border-b-2 border-[var(--border-default)]">
                <th className="px-3 py-3 text-left text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                  Ticker
                </th>
                <th className="px-3 py-3 text-right text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                  Price
                </th>
                <th className="px-3 py-3 text-right text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                  Change
                </th>
                <th className="px-3 py-3 text-right text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                  P/E
                </th>
                <th className="px-3 py-3 text-center text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                  Signal
                </th>
                <th className="px-3 py-3 text-center text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                  Action
                </th>
              </tr>
            </thead>

            {loading ? (
              <TableSkeleton />
            ) : (
              <tbody>
                {sortedRows.map((row) => (
                  <tr
                    key={row.ticker}
                    onClick={() =>
                      router.push(`/chat?q=${encodeURIComponent(`Analyse ${row.ticker} for my portfolio`)}`)
                    }
                    className="cursor-pointer border-b border-[var(--border-subtle)] transition-colors duration-100 hover:bg-[var(--bg-secondary)]"
                  >
                    <td className="mono px-3 py-4 text-left text-[14px] font-semibold text-[var(--text-primary)]">
                      {row.ticker}
                    </td>
                    <td className="mono px-3 py-4 text-right text-[13px] text-[var(--text-primary)]">
                      {row.price === null
                        ? "--"
                        : `\u20B9${row.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
                    </td>
                    <td className={`mono px-3 py-4 text-right text-[13px] ${row.changePercent === null ? "text-[var(--text-tertiary)]" : changeColor(row.changePercent)}`}>
                      {row.changePercent === null ? "--" : signedPercent(row.changePercent)}
                    </td>
                    <td className="mono px-3 py-4 text-right text-[13px] text-[var(--text-primary)]">
                      {row.pe === null ? "--" : row.pe.toFixed(1)}
                    </td>
                    <td className="px-3 py-4 text-center">
                      {row.signal === "NEUTRAL" ? (
                        <span className="text-[13px] text-[var(--text-tertiary)]">—</span>
                      ) : (
                        <span
                          className={`inline-flex rounded-[var(--radius-sm)] border px-2 py-1 text-[12px] font-medium ${signalStyle(
                            row.signal
                          )}`}
                        >
                          {row.signal}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-center">
                      <span className="text-[13px] text-[var(--text-secondary)]">Analyse →</span>
                    </td>
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
