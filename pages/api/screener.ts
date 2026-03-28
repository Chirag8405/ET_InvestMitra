import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import * as cheerio from "cheerio";

import type { Fundamentals } from "../../types";

const FUNDAMENTALS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const fundamentalsCache = new Map<string, { data: Fundamentals; expiresAt: number }>();

function toNumberOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/,/g, "").replace(/%/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeTicker(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function extractHoldingPercent($: cheerio.CheerioAPI, label: string): number | null {
  const row = $("table.data-table tr").filter((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim().toLowerCase();
    return text.includes(label.toLowerCase());
  }).first();

  if (!row.length) return null;

  const candidates: string[] = [];
  row.find("td, th").each((_, cell) => {
    const text = $(cell).text().trim();
    if (text) candidates.push(text);
  });

  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    const parsed = toNumberOrNull(candidates[i]);
    if (parsed !== null) return parsed;
  }

  return null;
}

function getCachedFundamentals(ticker: string): Fundamentals | null {
  const cached = fundamentalsCache.get(ticker);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    fundamentalsCache.delete(ticker);
    return null;
  }
  return cached.data;
}

function setCachedFundamentals(ticker: string, data: Fundamentals): void {
  fundamentalsCache.set(ticker, {
    data,
    expiresAt: Date.now() + FUNDAMENTALS_CACHE_TTL_MS,
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Fundamentals | { error: string; details?: string }>
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

  const cached = getCachedFundamentals(ticker);
  if (cached) {
    res.status(200).json(cached);
    return;
  }

  try {
    const url = `https://www.screener.in/company/${encodeURIComponent(ticker)}/`;
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Accept: "text/html,application/xhtml+xml",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);

    const pe = toNumberOrNull($("#top-ratios li:contains('P/E') .number").first().text());
    const pb = toNumberOrNull($("#top-ratios li:contains('P/B') .number").first().text());
    const roe = toNumberOrNull($("#top-ratios li:contains('ROE') .number").first().text());

    const debtToEquity = toNumberOrNull(
      $("#top-ratios li:contains('Debt to equity') .number").first().text()
    );

    const promoterHolding = extractHoldingPercent($, "promoter");
    const fiis = extractHoldingPercent($, "fii");

    const marketCapText = $("#top-ratios li:contains('Market Cap') .number").first().text().trim();
    const marketCap = marketCapText || null;

    const result: Fundamentals = {
      ticker,
      pe,
      pb,
      roe,
      debtToEquity,
      promoterHolding,
      fiis,
      marketCap,
      fetchedAt: new Date().toISOString(),
      source: "screener.in",
    };

    setCachedFundamentals(ticker, result);

    res.status(200).json(result);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    res.status(502).json({
      error: "Failed to fetch fundamentals from screener.in",
      details,
    });
  }
}
