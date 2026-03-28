"use client";

import type { Holding } from "../types";

type PortfolioDNAProps = {
  holdings: Holding[];
};

function toInr(value: number): string {
  return `\u20B9${value.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

export function PortfolioDNA({ holdings }: PortfolioDNAProps): React.JSX.Element {
  const totalInvested = holdings.reduce(
    (sum, holding) => sum + holding.quantity * holding.avgBuyPrice,
    0
  );

  const sectorValueMap = new Map<string, number>();
  for (const holding of holdings) {
    const value = holding.quantity * holding.avgBuyPrice;
    sectorValueMap.set(holding.sector, (sectorValueMap.get(holding.sector) || 0) + value);
  }

  const sectors = Array.from(sectorValueMap.entries())
    .map(([sector, value]) => ({
      sector,
      value,
      percent: totalInvested > 0 ? (value / totalInvested) * 100 : 0,
    }))
    .sort((a, b) => b.percent - a.percent);

  const topSector = sectors[0];

  return (
    <section className="border border-zinc-300 p-5 sm:p-6">
      <h3 className="text-sm font-semibold tracking-[0.08em] text-zinc-900 uppercase">
        Portfolio DNA
      </h3>

      <p className="mt-2 text-sm text-zinc-600">
        {holdings.length} holdings | {toInr(totalInvested)} total invested
      </p>

      {topSector ? (
        <p className="mt-1 text-sm text-zinc-700">
          {Math.round(topSector.percent)}% in {topSector.sector}
        </p>
      ) : (
        <p className="mt-1 text-sm text-zinc-700">No holdings added yet.</p>
      )}

      {sectors.length > 0 && (
        <div className="mt-4 space-y-3">
          {sectors.map((item) => (
            <div key={item.sector}>
              <div className="mb-1 flex items-center justify-between text-xs text-zinc-700">
                <span>{item.sector}</span>
                <span>{Math.round(item.percent)}%</span>
              </div>
              <div className="h-2 w-full border border-zinc-400 bg-white">
                <div
                  className="h-full bg-black"
                  style={{ width: `${Math.min(100, Math.max(0, item.percent))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
