import type {
  ChatMessage,
  Fundamentals,
  SourceCitation,
  StockData,
  UserProfile,
} from "../types";

export interface AssembledContext {
  contextString: string;
  citations: SourceCitation[];
}

function formatNumber(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits }) : "NA";
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function buildPortfolioSection(userProfile: UserProfile): {
  lines: string[];
  sectorConcentration: Array<{ sector: string; percent: number }>;
  totalInvestedValue: number;
  mostConcentratedSector: string | null;
  hasSingleStockAbove30: boolean;
} {
  const holdings = userProfile.holdings || [];
  const totalInvestedValue = holdings.reduce(
    (sum, holding) => sum + holding.quantity * holding.avgBuyPrice,
    0
  );

  const bySector = new Map<string, number>();
  const byStock: Array<{ ticker: string; weight: number; value: number }> = [];

  for (const holding of holdings) {
    const value = holding.quantity * holding.avgBuyPrice;
    bySector.set(holding.sector, (bySector.get(holding.sector) || 0) + value);
    const weight = totalInvestedValue > 0 ? (value / totalInvestedValue) * 100 : 0;
    byStock.push({ ticker: holding.ticker, weight, value });
  }

  let mostConcentratedSector: string | null = null;
  let mostConcentratedSectorPct = 0;
  const sectorConcentration: Array<{ sector: string; percent: number }> = [];

  for (const [sector, value] of bySector.entries()) {
    const pct = totalInvestedValue > 0 ? (value / totalInvestedValue) * 100 : 0;
    sectorConcentration.push({ sector, percent: pct });
    if (pct > mostConcentratedSectorPct) {
      mostConcentratedSectorPct = pct;
      mostConcentratedSector = sector;
    }
  }

  sectorConcentration.sort((a, b) => b.percent - a.percent);

  const hasSingleStockAbove30 = byStock.some((stock) => stock.weight > 30);

  const rupee = "\u20B9";
  const lines = holdings.map((holding) => {
    const value = holding.quantity * holding.avgBuyPrice;
    const weight = totalInvestedValue > 0 ? (value / totalInvestedValue) * 100 : 0;
    return `${holding.ticker} x ${holding.quantity} @ avg ${rupee}${formatNumber(holding.avgBuyPrice, 0)} | Sector: ${holding.sector} | Weight: ${formatPercent(weight)}`;
  });

  if (mostConcentratedSector && mostConcentratedSectorPct > 30) {
    lines.push(
      `WARNING: ${mostConcentratedSector} sector concentration is ${formatPercent(mostConcentratedSectorPct)} - above 30% threshold`
    );
  }

  if (hasSingleStockAbove30) {
    const topStock = byStock
      .slice()
      .sort((a, b) => b.weight - a.weight)[0];
    if (topStock) {
      lines.push(
        `WARNING: ${topStock.ticker} position weight is ${formatPercent(topStock.weight)} - single stock exposure above 30%`
      );
    }
  }

  return {
    lines,
    sectorConcentration,
    totalInvestedValue,
    mostConcentratedSector,
    hasSingleStockAbove30,
  };
}

function buildMarketSection(stockData: StockData[]): {
  lines: string[];
  citations: SourceCitation[];
} {
  if (!stockData || stockData.length === 0) {
    return {
      lines: ["No live market data available."],
      citations: [],
    };
  }

  return {
    lines: stockData.flatMap((s) => {
      const rupee = "\u20B9";
      const changeSign = s.changePercent > 0 ? "+" : "";
      const sourceLabel = s.source === "NSE" ? "NSE" : "yfinance";
      return [
        `${s.ticker}: ${rupee}${formatNumber(s.price)} | ${changeSign}${s.changePercent.toFixed(2)}% today | 52w: ${rupee}${formatNumber(s.low52w, 0)}-${rupee}${formatNumber(s.high52w, 0)}`,
        `[Source: ${sourceLabel} | ${new Date(s.fetchedAt).toLocaleTimeString("en-IN")}]`,
      ];
    }),
    citations: stockData.map((s) => ({
      label: `${s.ticker} - NSE Live`,
      timestamp: new Date(s.fetchedAt).toLocaleString("en-IN"),
      url: `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(s.ticker)}`,
    })),
  };
}

function buildFundamentalsSection(fundamentals: Fundamentals[]): {
  lines: string[];
  citations: SourceCitation[];
} {
  if (!fundamentals || fundamentals.length === 0) {
    return {
      lines: ["No fundamentals data available."],
      citations: [],
    };
  }

  const display = (value: number | null, suffix = ""): string =>
    value === null ? "null" : `${value}${suffix}`;

  return {
    lines: fundamentals.flatMap((f) => [
      `${f.ticker}: P/E: ${display(f.pe)} | P/B: ${display(f.pb)} | ROE: ${display(f.roe, "%")} | Promoter: ${display(f.promoterHolding, "%")}`,
      `[Source: Screener.in | ${new Date(f.fetchedAt).toLocaleTimeString("en-IN")}]`,
    ]),
    citations: fundamentals.map((f) => ({
      label: `${f.ticker} - Fundamentals`,
      timestamp: new Date(f.fetchedAt).toLocaleString("en-IN"),
      url: `https://www.screener.in/company/${encodeURIComponent(f.ticker)}/`,
    })),
  };
}

function buildHistorySection(chatHistory: ChatMessage[]): string[] {
  if (!chatHistory.length) {
    return ["No prior chat history."];
  }

  const MAX_HISTORY_CHARS = 8000;
  const recentMessages = chatHistory.slice(-20);
  let historyChars = recentMessages.reduce((sum, message) => sum + message.content.length, 0);
  const trimmed = [...recentMessages];

  while (historyChars > MAX_HISTORY_CHARS && trimmed.length > 4) {
    const removed = trimmed.shift();
    historyChars -= removed?.content.length ?? 0;
  }

  const lines = trimmed.map(
    (message) => `[${message.role.toUpperCase()}] ${message.content}`
  );

  if (trimmed.length < recentMessages.length) {
    return [
      `[Note: Earlier conversation history omitted to fit context window. Showing last ${trimmed.length} messages.]`,
      ...lines,
    ];
  }

  return lines;
}

export function assembleClaudeContext(
  userProfile: UserProfile,
  chatHistory: ChatMessage[],
  stockData: StockData[],
  fundamentals: Fundamentals[],
  currentQuestion: string,
  newsHeadlines: string[] = [],
  newsFetchedAt: string = new Date().toISOString()
): AssembledContext {
  const portfolio = buildPortfolioSection(userProfile);
  const market = buildMarketSection(stockData);
  const screener = buildFundamentalsSection(fundamentals);
  const historyLines = buildHistorySection(chatHistory);

  const citations: SourceCitation[] = [];
  citations.push({
    label: "Portfolio Analysis",
    timestamp: new Date().toLocaleString("en-IN"),
    url: undefined,
  });
  citations.push(...market.citations);
  citations.push(...screener.citations);
  citations.push({
    label: "ET Markets RSS - News Signals",
    timestamp: new Date(newsFetchedAt).toLocaleString("en-IN"),
    url: "https://economictimes.indiatimes.com/markets/stocks/rss.cms",
  });

  const newsLines =
    newsHeadlines.length > 0
      ? newsHeadlines.map((headline) => `• ${headline}`)
      : ["• No recent market headlines available."];

  const contextString = [
    "=== USER PROFILE ===",
    `Age group: ${userProfile.ageGroup} | Risk: ${userProfile.riskProfile} | Goal: ${userProfile.investmentGoal}`,
    `Mode: ${userProfile.mode}`,
    "",
    `=== PORTFOLIO (${userProfile.holdings.length} holdings) ===`,
    ...portfolio.lines,
    `Total invested value: \u20B9${formatNumber(portfolio.totalInvestedValue, 0)}`,
    `Sector concentration: ${portfolio.sectorConcentration
      .map((entry) => `${entry.sector} ${formatPercent(entry.percent)}`)
      .join(" | ") || "NA"}`,
    `Most concentrated sector: ${portfolio.mostConcentratedSector || "NA"}`,
    `Any single stock above 30%: ${portfolio.hasSingleStockAbove30 ? "Yes" : "No"}`,
    "",
    "=== LIVE MARKET DATA ===",
    ...market.lines,
    "",
    "=== FUNDAMENTALS ===",
    ...screener.lines,
    "",
    "=== NEWS SIGNALS (last 48 hours) ===",
    ...newsLines,
    `[Source: ET Markets RSS | ${new Date(newsFetchedAt).toLocaleString("en-IN")}]`,
    "",
    "=== CHAT HISTORY ===",
    ...historyLines,
    "",
    "=== USER QUESTION ===",
    currentQuestion,
  ].join("\n");

  return { contextString, citations };
}
