import type { NextApiRequest, NextApiResponse } from "next";

type NewsResponse = {
  headlines: string[];
  fetchedAt: string;
};

const ET_RSS_URL = "https://economictimes.indiatimes.com/markets/stocks/rss.cms";
const LOOKBACK_MS = 48 * 60 * 60 * 1000;
const NEWS_CACHE_TTL_MS = 45 * 60 * 1000;
const newsCache = new Map<string, { data: NewsResponse; expiresAt: number }>();

const TICKER_TO_COMPANY: Record<string, string> = {
  RELIANCE: "Reliance",
  HDFCBANK: "HDFC Bank",
  TCS: "TCS",
  INFY: "Infosys",
  ICICIBANK: "ICICI Bank",
  WIPRO: "Wipro",
  TATAMOTORS: "Tata Motors",
  BAJFINANCE: "Bajaj Finance",
  SBIN: "SBI",
  AXISBANK: "Axis Bank",
  MARUTI: "Maruti",
  ADANIPORTS: "Adani",
  NESTLEIND: "Nestle",
  HINDUNILVR: "HUL",
  ASIANPAINT: "Asian Paint",
  ITC: "ITC",
  LT: "L&T",
  SUNPHARMA: "Sun Pharma",
  TITAN: "Titan",
  ULTRACEMCO: "UltraTech",
};

type NewsItem = {
  title: string;
  pubDate: string;
};

function safeTicker(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function decodeXml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function extractTagValue(itemXml: string, tag: string): string {
  const match = itemXml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return decodeXml(match?.[1] || "");
}

function parseRssItems(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match = itemRegex.exec(xml);
  while (match) {
    const itemXml = match[1];
    const title = extractTagValue(itemXml, "title");
    const pubDate = extractTagValue(itemXml, "pubDate");
    if (title) {
      items.push({ title, pubDate });
    }
    match = itemRegex.exec(xml);
  }
  return items;
}

function isRecent(pubDate: string): boolean {
  const time = new Date(pubDate).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= LOOKBACK_MS;
}

function getCachedNews(cacheKey: string): NewsResponse | null {
  const cached = newsCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    newsCache.delete(cacheKey);
    return null;
  }
  return cached.data;
}

function setCachedNews(cacheKey: string, data: NewsResponse): void {
  newsCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + NEWS_CACHE_TTL_MS,
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NewsResponse | { error: string }>
): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const ticker = safeTicker((req.query.ticker || "").toString());
  const companyName = ticker ? TICKER_TO_COMPANY[ticker] : "";
  const cacheKey = ticker || "GENERAL";

  const cached = getCachedNews(cacheKey);
  if (cached) {
    res.status(200).json(cached);
    return;
  }

  try {
    const response = await fetch(ET_RSS_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
      },
    });

    if (!response.ok) {
      res.status(502).json({ error: "Unable to fetch ET RSS" });
      return;
    }

    const xml = await response.text();
    const items = parseRssItems(xml).slice(0, 10).filter((item) => isRecent(item.pubDate));

    const tickerSpecific = companyName
      ? items.filter((item) => item.title.toLowerCase().includes(companyName.toLowerCase()))
      : [];

    const selected = (tickerSpecific.length > 0 ? tickerSpecific : items)
      .map((item) => item.title)
      .slice(0, 5);

    const payload: NewsResponse = {
      headlines: selected,
      fetchedAt: new Date().toISOString(),
    };

    setCachedNews(cacheKey, payload);
    res.status(200).json(payload);
  } catch {
    res.status(502).json({ error: "Unable to fetch news signals" });
  }
}
