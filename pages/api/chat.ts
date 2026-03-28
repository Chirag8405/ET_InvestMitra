import Anthropic from "@anthropic-ai/sdk";
import type { NextApiRequest, NextApiResponse } from "next";

import { assembleClaudeContext } from "../../lib/context-assembler";
import {
  ANALYST_SYSTEM_PROMPT,
  EXPLAIN_SYSTEM_PROMPT,
  ONBOARDING_CONTEXT_PRIMER,
} from "../../lib/prompts";
import type { ChatMessage, Fundamentals, StockData, UserProfile } from "../../types";

const KNOWN_NSE_TICKERS = new Set<string>([
  "RELIANCE",
  "TCS",
  "INFY",
  "HDFCBANK",
  "ICICIBANK",
  "SBIN",
  "ITC",
  "LT",
  "AXISBANK",
  "KOTAKBANK",
  "BAJFINANCE",
  "BHARTIARTL",
  "HINDUNILVR",
  "MARUTI",
  "SUNPHARMA",
  "TITAN",
  "ASIANPAINT",
  "NESTLEIND",
  "WIPRO",
  "ULTRACEMCO",
  "NTPC",
  "POWERGRID",
  "ONGC",
  "ADANIENT",
  "ADANIPORTS",
  "M_M",
  "HCLTECH",
  "TECHM",
  "INDUSINDBK",
  "TATAMOTORS",
  "COALINDIA",
]);

type ChatRequestBody = {
  messages: ChatMessage[];
  profile: UserProfile;
  question: string;
};

type NewsPayload = {
  headlines: string[];
  fetchedAt: string;
};

function extractTickers(question: string): string[] {
  const candidates = question.toUpperCase().match(/[A-Z]{2,}/g) || [];
  const deduped = Array.from(new Set(candidates));
  return deduped.filter((ticker) => KNOWN_NSE_TICKERS.has(ticker));
}

function sseData(payload: string): string {
  return `data: ${payload}\n\n`;
}

async function fetchStockAndFundamentals(
  baseUrl: string,
  ticker: string
): Promise<{ stock: StockData | null; fundamentals: Fundamentals | null; stockFailed: boolean }> {
  const [stockResult, screenerResult] = await Promise.all([
    fetch(`${baseUrl}/api/stock?ticker=${encodeURIComponent(ticker)}`)
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as StockData;
      })
      .catch(() => null),
    fetch(`${baseUrl}/api/screener?ticker=${encodeURIComponent(ticker)}`)
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as Fundamentals;
      })
      .catch(() => null),
  ]);

  return {
    stock: stockResult,
    fundamentals: screenerResult,
    stockFailed: stockResult === null,
  };
}

function writeMockStream(
  res: NextApiResponse,
  citations: ReturnType<typeof assembleClaudeContext>["citations"],
  meta: { firstTicker?: string; priceAtTime: number }
): void {
  const mockText =
    "**MARKET ASSESSMENT**\n" +
    "Live AI analysis is running in mock mode because ANTHROPIC_API_KEY is not configured. Market data and fundamentals context were assembled successfully.\n\n" +
    "**FOR YOUR PORTFOLIO**\n" +
    "Your current holdings were evaluated for concentration and risk exposure using the provided profile.\n\n" +
    "**CONTRARIAN CORNER**\n" +
    "Without live model inference, adverse scenarios may be under-covered in this mock response.";

  res.write(sseData(`META:${JSON.stringify(meta)}`));
  res.write(sseData(mockText));
  res.write(sseData(`CITATIONS:${JSON.stringify(citations)}`));
  res.write(sseData("[DONE]"));
  res.end();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body =
    typeof req.body === "string"
      ? (JSON.parse(req.body) as ChatRequestBody)
      : (req.body as ChatRequestBody);

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const profile = body?.profile;
  const question = (body?.question || "").toString();

  if (!profile || !question) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const proto = (req.headers["x-forwarded-proto"] as string) || "http";
  const host = req.headers.host || "localhost:3000";
  const baseUrl = `${proto}://${host}`;

  const mentionedTickers = extractTickers(question);
  const firstMentionedTicker = mentionedTickers[0] || "";

  let allStockData: StockData[] = [];
  let allFundamentals: Fundamentals[] = [];
  let newsHeadlines: string[] = [];
  let newsFetchedAt = new Date().toISOString();
  let liveDataUnavailable = false;

  const newsPromise = fetch(
    `${baseUrl}/api/news${firstMentionedTicker ? `?ticker=${encodeURIComponent(firstMentionedTicker)}` : ""}`
  )
    .then(async (response) => {
      if (!response.ok) return null;
      return (await response.json()) as NewsPayload;
    })
    .catch(() => null);

  if (mentionedTickers.length > 0) {
    const [tickerData, newsResult] = await Promise.all([
      Promise.all(mentionedTickers.map((ticker) => fetchStockAndFundamentals(baseUrl, ticker))),
      newsPromise,
    ]);

    if (newsResult?.headlines?.length) {
      newsHeadlines = newsResult.headlines;
      newsFetchedAt = newsResult.fetchedAt || newsFetchedAt;
    }

    // Collect ALL successful stock results
    allStockData = tickerData
      .map((item) => item.stock)
      .filter((value): value is StockData => Boolean(value));

    // Collect ALL successful fundamentals results
    allFundamentals = tickerData
      .map((item) => item.fundamentals)
      .filter((value): value is Fundamentals => Boolean(value));

    liveDataUnavailable = tickerData.some((item) => item.stockFailed);
  } else {
    const newsResult = await newsPromise;
    if (newsResult?.headlines?.length) {
      newsHeadlines = newsResult.headlines;
      newsFetchedAt = newsResult.fetchedAt || newsFetchedAt;
    }
  }

  const { contextString, citations } = assembleClaudeContext(
    profile,
    messages,
    allStockData,
    allFundamentals,
    question,
    newsHeadlines,
    newsFetchedAt
  );

  const fullContext = `${contextString}${liveDataUnavailable ? "\n\nNOTE: live data unavailable" : ""}`;
  const baseSystemPrompt =
    profile.mode === "explain" ? EXPLAIN_SYSTEM_PROMPT : ANALYST_SYSTEM_PROMPT;
  const userMessageCount = messages.filter((message) => message.role === "user").length;
  const useOnboardingPrimer = userMessageCount > 0 && userMessageCount <= 3;
  const systemPrompt = useOnboardingPrimer
    ? `${ONBOARDING_CONTEXT_PRIMER}\n\n${baseSystemPrompt}`
    : baseSystemPrompt;

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  const apiKey = process.env.ANTHROPIC_API_KEY || "";
  if (!apiKey || apiKey === "your_key_here") {
    writeMockStream(res, citations, {
      firstTicker: allStockData[0]?.ticker,
      priceAtTime: allStockData[0]?.price ?? 0,
    });
    return;
  }

  const anthropic = new Anthropic({ apiKey });

  let stream: AsyncIterable<unknown>;
  try {
    stream = (await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      thinking: { type: "enabled", budget_tokens: 3000 },
      stream: true,
      system: [{ type: "text", text: systemPrompt }],
      messages: [
        {
          role: "user",
          content: `${fullContext}\n\n${question}`,
        },
      ],
    })) as unknown as AsyncIterable<unknown>;
  } catch {
    res.status(500).json({ error: "AI service unavailable" });
    return;
  }

  try {
    res.write(
      sseData(
        `META:${JSON.stringify({
          firstTicker: allStockData[0]?.ticker,
          priceAtTime: allStockData[0]?.price ?? 0,
        })}`
      )
    );

    for await (const rawEvent of stream) {
      const event = rawEvent as {
        type?: string;
        delta?: { type?: string; text?: string; thinking?: string };
        content_block?: { type?: string; text?: string; thinking?: string };
      };

      if (
        event.type === "content_block_delta" &&
        event.delta?.type === "thinking_delta" &&
        event.delta.thinking
      ) {
        res.write(sseData(`THINKING:${event.delta.thinking}`));
        continue;
      }

      if (
        event.type === "content_block_start" &&
        event.content_block?.type === "thinking" &&
        event.content_block.thinking
      ) {
        res.write(sseData(`THINKING:${event.content_block.thinking}`));
        continue;
      }

      if (
        event.type === "content_block_delta" &&
        event.delta?.type === "text_delta" &&
        event.delta.text
      ) {
        res.write(sseData(event.delta.text));
      }
    }

    res.write(sseData(`CITATIONS:${JSON.stringify(citations)}`));
    res.write(sseData("[DONE]"));
    res.end();
  } catch {
    res.write(sseData("[DONE]"));
    res.end();
  }
}
