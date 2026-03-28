import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";

import type { StockData } from "../../types";

const execAsync = promisify(exec);

let nseSession: { cookie: string; expiresAt: number } | null = null;
const STOCK_CACHE_TTL_MS = 10 * 1000;
const stockCache = new Map<string, { data: StockData; expiresAt: number }>();

const NSE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nseindia.com",
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/,/g, "").replace(/%/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeTicker(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function isNiftyTicker(ticker: string): boolean {
  return ticker === "NIFTY50" || ticker === "NIFTY";
}

async function fetchFromNSEIndices(ticker: string): Promise<StockData> {
  const cookieHeader = await getNseCookie();

  const allIndicesResponse = await axios.get("https://www.nseindia.com/api/allIndices", {
    headers: {
      ...NSE_HEADERS,
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    timeout: 15000,
  });

  const indexData = (allIndicesResponse.data?.data || []).find(
    (row: { indexSymbol?: string }) => row?.indexSymbol === "NIFTY 50"
  );

  if (!indexData) {
    throw new Error("NIFTY 50 data unavailable from NSE");
  }

  const last = toNumber(indexData?.last);
  const change = toNumber(indexData?.change);
  const previousClose = toNumber(indexData?.previousClose || last - change);
  const changePercent =
    previousClose !== 0 ? (change / previousClose) * 100 : toNumber(indexData?.percentChange);

  return {
    ticker,
    price: last,
    change,
    changePercent,
    high52w: toNumber(indexData?.yearHigh),
    low52w: toNumber(indexData?.yearLow),
    volume: 0,
    fetchedAt: new Date().toISOString(),
    source: "NSE",
    confidence: "high",
  };
}

async function fetchFromNSE(ticker: string): Promise<StockData> {
  const cookieHeader = await getNseCookie();

  const quoteResponse = await axios.get(
    `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(ticker)}`,
    {
      headers: {
        ...NSE_HEADERS,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      timeout: 15000,
    }
  );

  const priceInfo = quoteResponse.data?.priceInfo || {};
  const weekHighLow = priceInfo?.weekHighLow || {};

  return {
    ticker,
    price: toNumber(priceInfo?.lastPrice),
    change: toNumber(priceInfo?.change),
    changePercent: toNumber(priceInfo?.pChange),
    high52w: toNumber(weekHighLow?.max),
    low52w: toNumber(weekHighLow?.min),
    volume: toNumber(priceInfo?.totalTradedVolume),
    fetchedAt: new Date().toISOString(),
    source: "NSE",
    confidence: "high",
  };
}

async function fetchFromYFinance(ticker: string): Promise<StockData> {
  const yfTicker = isNiftyTicker(ticker) ? "^NSEI" : `${ticker}.NS`;

  const pythonCode = [
    "import yfinance as yf, json",
    `t = yf.Ticker('${yfTicker}')`,
    "info = t.fast_info",
    "print(json.dumps({",
    "  'price': info.last_price,",
    "  'change': info.last_price - info.previous_close,",
    "  'changePercent': ((info.last_price - info.previous_close) / info.previous_close) * 100,",
    "  'high52w': info.year_high,",
    "  'low52w': info.year_low,",
    "  'volume': info.three_month_average_volume",
    "}))",
  ].join("\\n");

  const pythonArg = JSON.stringify(pythonCode);
  const { stdout } = (await Promise.race([
    execAsync(`python3 -c ${pythonArg}`),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("yfinance timeout")), 5000);
    }),
  ])) as { stdout: string };
  const parsed = JSON.parse(stdout.trim());

  return {
    ticker,
    price: toNumber(parsed?.price),
    change: toNumber(parsed?.change),
    changePercent: toNumber(parsed?.changePercent),
    high52w: toNumber(parsed?.high52w),
    low52w: toNumber(parsed?.low52w),
    volume: toNumber(parsed?.volume),
    fetchedAt: new Date().toISOString(),
    source: "yfinance",
    confidence: "medium",
  };
}

function getCachedStock(ticker: string): StockData | null {
  const cached = stockCache.get(ticker);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    stockCache.delete(ticker);
    return null;
  }
  return cached.data;
}

function setCachedStock(ticker: string, data: StockData): void {
  stockCache.set(ticker, {
    data,
    expiresAt: Date.now() + STOCK_CACHE_TTL_MS,
  });
}

async function getNseCookie(): Promise<string> {
  if (nseSession && Date.now() < nseSession.expiresAt) {
    return nseSession.cookie;
  }

  const response = await fetch("https://www.nseindia.com/", {
    headers: NSE_HEADERS,
  });

  const cookie = response.headers.get("set-cookie") || "";
  nseSession = {
    cookie,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
  return cookie;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StockData | { error: string; details?: string }>
): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rawTicker = (req.query.ticker || req.query.symbol || "").toString();
  const ticker = safeTicker(rawTicker);

  if (!ticker) {
    res.status(400).json({ error: "Missing or invalid ticker" });
    return;
  }

  const cached = getCachedStock(ticker);
  if (cached) {
    res.status(200).json(cached);
    return;
  }

  try {
    const data = isNiftyTicker(ticker)
      ? await fetchFromNSEIndices(ticker)
      : await fetchFromNSE(ticker);
    setCachedStock(ticker, data);
    res.status(200).json(data);
    return;
  } catch (nseError) {
    try {
      const data = await fetchFromYFinance(ticker);
      setCachedStock(ticker, data);
      res.status(200).json(data);
      return;
    } catch (yfinanceError) {
      const nseDetails = nseError instanceof Error ? nseError.message : "NSE request failed";
      const yfinanceDetails =
        yfinanceError instanceof Error ? yfinanceError.message : "yfinance request failed";
      res.status(503).json({
        error: "Stock data unavailable",
        details: `NSE failed: ${nseDetails}; yfinance failed: ${yfinanceDetails}`,
      });
    }
  }
}
