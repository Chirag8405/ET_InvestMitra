# InvestMitra

Portfolio-aware AI market analyst for Indian retail investors.

InvestMitra combines live market data, fundamentals, and user portfolio context to generate structured analysis with citations, contrarian thinking, and optional voice interaction.

## 1) Problem Statement

Traditional retail market assistants are usually weak in one or more areas:

- Generic output not tied to the user's actual holdings.
- Missing or low-quality source attribution.
- Weak downside framing (no explicit bear case).
- No durable memory across refreshes.
- Cosmetic reasoning steps not grounded in real backend operations.
- Poor handling of multi-ticker questions.

InvestMitra addresses these issues by enforcing structured responses and combining portfolio intelligence with live data and cited sources.

## 2) What Was Fixed

The application was audited and upgraded across critical paths:

1. Contrarian parsing consistency across analyst/explain modes.
2. Multi-ticker context now includes all fetched stocks/fundamentals (not just first success).
3. Durable chat history via localStorage + context-window-aware truncation.
4. Real source links (NSE, Screener, ET RSS) displayed in clickable badges.
5. News reasoning step backed by real ET Markets RSS fetch.
6. Voice improvements:
- Optional auto-read responses.
- Functional microphone input (SpeechRecognition), hidden when unsupported.
7. Stock API hardening:
- Removed runtime pip install.
- Added yfinance install-time dependency.
- Timeout-protected fallback execution.
- Cached NSE cookie session.
8. ESLint configuration aligned with Next.js 14 + ESLint 8.
9. Behavioral decision logging + Discipline Score in sidebar.

## 3) Product Features

- Onboarding with profile + holdings capture.
- Two response modes:
- Analyst mode (technical).
- Explain mode (plain language).
- Structured output sections with mandatory contrarian block.
- Streaming chat responses.
- Reasoning chain UI.
- Portfolio concentration checks.
- Top Signals dashboard for major NSE symbols.
- Source citations with outbound links.
- Voice playback and optional voice input.
- Behavioral decision log and placeholder discipline scoring.

## 4) Architecture

### Frontend (Next.js App Router)

- `app/page.tsx`: onboarding flow.
- `app/chat/page.tsx`: chat UI, sidebar, mode toggle, voice toggle, decision summary.
- `app/signals/page.tsx`: signals dashboard.

### Hooks

- `hooks/usePortfolio.ts`: portfolio/profile persistence.
- `hooks/useChat.ts`: streaming chat, reasoning step state, chat persistence, decision logging.
- `hooks/useVoice.ts`: text-to-speech, speech-to-text, contrarian stripping for voice.
- `hooks/useDecisionLog.ts`: behavioral log storage and score calculation.

### Backend (Next.js API Routes)

- `pages/api/chat.ts`: orchestrates stock/fundamental/news fetches, assembles context, streams LLM response.
- `pages/api/stock.ts`: NSE primary, yfinance fallback.
- `pages/api/screener.ts`: Screener fundamentals extraction.
- `pages/api/news.ts`: ET RSS headlines (48h filtered).

### Context + Prompting

- `lib/context-assembler.ts`: composes portfolio, market, fundamentals, news, and chat history into model context.
- `lib/prompts.ts`: system prompts for analyst and explain modes.

### Types

- `types/index.ts`: shared domain types (`StockData`, `Fundamentals`, `ChatMessage`, `DecisionLog`, etc.).

## 5) Data Flow

1. User sends question from chat UI.
2. Backend extracts tickers and fetches, in parallel:
- Stock data (`/api/stock`) for each ticker.
- Fundamentals (`/api/screener`) for each ticker.
- News (`/api/news`) for first relevant ticker.
3. Context is assembled with profile + history + market/fundamentals/news.
4. Prompt + context are streamed to model.
5. Streamed response and citations render in UI.
6. Assistant response is persisted; decision log entry is stored.

## 6) Setup Instructions

### Prerequisites

- Node.js 18+ and npm.
- Python 3 + pip (optional but recommended for yfinance fallback path).

### Install

```bash
npm install
```

`postinstall` attempts to install Python deps from `requirements.txt` quietly.

### Environment

Create `.env.local`:

```env
ANTHROPIC_API_KEY=your_actual_key_here
```

If API key is absent, chat route runs in mock-response mode for UI/dev validation.

### Run (development)

```bash
npm run dev
```

Open `http://localhost:3000`.

### Build (production check)

```bash
npm run build
```

### Lint

```bash
npx eslint . --ext .ts,.tsx
```

## 7) Verification Checklist

Recommended sanity checks after setup:

1. Build and lint pass.
2. Ask in explain mode and ensure `CONTRARIAN CORNER` is rendered.
3. Ask: "Compare TCS and INFY for my portfolio" and verify both appear in citations/context-backed output.
4. Refresh mid-conversation and confirm messages persist.
5. Click source badges and verify NSE/Screener URLs open.
6. Check news citations appear from ET RSS.
7. Measure stock API latency:

```bash
time curl -s "http://localhost:3000/api/stock?ticker=RELIANCE"
```

8. Enable "Read responses aloud" and verify auto-voice after response completion.
9. Confirm sidebar shows decisions count and discipline score after chat interactions.

## 8) API Reference (Quick)

### `POST /api/chat`

Request body:

```json
{
	"messages": [],
	"profile": { "...": "UserProfile" },
	"question": "Compare TCS and INFY"
}
```

Response: Server-Sent Events stream with `META:`, text chunks, `CITATIONS:`, `[DONE]`.

### `GET /api/stock?ticker=RELIANCE`

Returns live stock snapshot from NSE or yfinance fallback.

### `GET /api/screener?ticker=TCS`

Returns basic fundamentals scraped from Screener.

### `GET /api/news?ticker=TCS`

Returns ET RSS headlines (up to 5) within last 48 hours.

## 9) Known Limitations

- If ET RSS has no recent ticker-matching headlines, news array may be empty.
- SpeechRecognition availability depends on browser engine.
- yfinance fallback path depends on Python environment availability.
- One non-blocking lint warning may still appear for hook dependency strictness.

## 10) Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS + shadcn/ui
- Anthropic SDK
- NSE + Screener + ET RSS + yfinance (fallback)
