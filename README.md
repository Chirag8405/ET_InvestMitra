# InvestMitra

Portfolio-aware market intelligence for Indian retail investors, with live data, cited sources, reasoning visibility, and a contrarian view on every response.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Add your Anthropic key in `.env.local`:

```env
ANTHROPIC_API_KEY=your_actual_key_here
```

3. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## How it beats ET's existing product

| Existing Product Flaw | InvestMitra Improvement |
| --- | --- |
| Generic market commentary | Portfolio-aware analysis tied to your holdings |
| No clear source traceability | Every data-backed response includes citations |
| Hidden model reasoning | Visible reasoning chain with step-by-step status |
| No explicit downside framing | Dedicated Contrarian Corner in every answer |
| One-size-fits-all tone | Dual modes: Analyst and Explain It To Me |
| Weak portfolio risk context | Concentration and exposure awareness baked in |
| Static screening tools | Live signals dashboard with actionable context |

## Core Features

- 3-step onboarding with profile + holdings capture
- Streaming chat with citations and thinking feed
- Source-aware fundamentals and live market endpoints
- Top Signals dashboard over 15 liquid NSE names
- Voice playback for key response sections

## Demo questions to try

1. Should I add more HDFCBANK at current levels?
2. Which of my holdings is most exposed to sector concentration risk?
3. Analyse RELIANCE for my portfolio with a bear case.
4. What are the strongest momentum signals in my portfolio today?
5. Explain whether IT stocks are overvalued right now in plain English.

## Tech Stack

- Next.js 14 (App Router + API routes)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Anthropic Claude API
- NSE + Screener + yfinance data integration
