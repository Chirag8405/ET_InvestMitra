# InvestMitra


## What This App Is About

InvestMitra is a portfolio-aware AI market analyst for Indian equities.

It combines:

- User holdings and investor profile.
- Live market snapshots.
- Screener fundamentals.
- ET Markets news signals.

The app then generates structured analysis with citations and a mandatory contrarian view.

## What Problem It Fixes

Retail investing assistants are often generic and miss portfolio context.

Common issues:

- Responses are not tied to the user's actual holdings.
- Limited downside framing and weak bear-case discussion.
- Missing source transparency.
- Poor continuity across refreshes.
- Weak mobile usability in chat-first workflows.

## How It Fixes The Problem

InvestMitra fixes those gaps through product and architecture choices:

1. Portfolio-aware context assembly.
- `lib/context-assembler.ts` merges holdings, concentration checks, market data, fundamentals, news, and recent chat history.

2. Strict response contracts.
- `lib/prompts.ts` enforces structured outputs and mandatory contrarian coverage.

3. Streaming + citations.
- `pages/api/chat.ts` streams responses over SSE and emits citation payloads.

4. Multi-source data strategy.
- `pages/api/stock.ts` uses NSE first and falls back to yfinance.
- `pages/api/screener.ts` fetches fundamentals from Screener.
- `pages/api/news.ts` fetches ET RSS headlines.

5. Resilience and persistence.
- Local persistence for profile, theme, chat history, and decision logs.
- Source caching to reduce repeated external fetches and improve responsiveness.

6. Mobile-first UX improvements.
- Chat prompt tray with chevron toggle on small screens.
- Larger mobile bottom-nav tap targets and hide-on-typing behavior.
- Overflow guards for long generated content.

## Contrarian Part (Bear-Case Engine)

The contrarian part is a first-class requirement in InvestMitra.

What it does:

- Forces a downside scenario in every AI response.
- Prevents one-sided bullish answers.
- Makes the user see what could go wrong before taking action.

Where it is implemented:

1. Prompt-level enforcement
- `lib/prompts.ts` requires a `CONTRARIAN CORNER` section in both analyst and explain modes.

2. API streaming pipeline
- `pages/api/chat.ts` appends a format reminder so streamed output includes the contrarian section.

3. UI parsing and rendering
- `components/ChatMessage.tsx` detects/splits contrarian blocks from assistant content.
- `components/ContrarianCorner.tsx` renders the expandable bear-case panel in chat.

Quick validation:

- Ask: "What is the outlook for RELIANCE in my portfolio?"
- Confirm the answer contains a dedicated `CONTRARIAN CORNER` block.

## Architecture

### Frontend (App Router)

- `app/page.tsx` - onboarding and holdings setup.
- `app/chat/page.tsx` - chat experience, prompts, mobile nav, drawer, theme toggle.
- `app/signals/page.tsx` - market signals view with mobile cards and desktop table.

### Backend (API Routes)

- `pages/api/chat.ts` - context orchestration and provider streaming.
- `pages/api/stock.ts` - NSE quote fetch + yfinance fallback.
- `pages/api/screener.ts` - fundamentals extraction.
- `pages/api/news.ts` - ET RSS ingestion with ticker filtering.

### Hooks and State

- `hooks/usePortfolio.ts` - profile and holdings persistence.
- `hooks/useChat.ts` - chat state, streaming parsing, chat persistence, decision logs.
- `hooks/useVoice.ts` - speech synthesis utilities.
- `hooks/useTheme.ts` - light and dark theme handling.
- `hooks/useDecisionLog.ts` - behavior log and simple score utility.

### AI Provider Flow

`/api/chat` provider order:

1. Groq (`GROQ_API_KEY`) using `qwen/qwen3-32b`.
2. Anthropic (`ANTHROPIC_API_KEY`) using `claude-sonnet-4-20250514`.
3. Mock streaming response when no key is configured.

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm
- Python 3 + pip (recommended for yfinance fallback path)

### Install

```bash
npm install
```

Note: `postinstall` attempts to install Python dependencies from `requirements.txt` quietly.

### Environment

Create `.env.local` in the project root:

```env
GROQ_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```

Only one key is required.

### Run In Development

```bash
npm run dev
```

Open `http://localhost:3000`.

### Build

```bash
npm run build
```

### Start Production Server

```bash
npm run start
```

### Lint

```bash
npm run lint
```

## API Summary

### `POST /api/chat`

Input:

```json
{
  "messages": [],
  "profile": { "...": "UserProfile" },
  "question": "Compare TCS and INFY for my portfolio"
}
```

Output: SSE stream with `META`, optional `THINKING`, text chunks, `CITATIONS`, and `[DONE]`.

### `GET /api/stock?ticker=RELIANCE`

Returns stock snapshot from NSE or yfinance fallback.

### `GET /api/screener?ticker=TCS`

Returns Screener fundamentals for ticker.

### `GET /api/news?ticker=TCS`

Returns recent ET RSS headlines.

## Tech Stack

- Next.js 14
- React 18 + TypeScript
- Tailwind CSS
- Groq SDK
- Anthropic SDK
- axios + cheerio
