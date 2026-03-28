export type UserMode = 'analyst' | 'explain';


export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';


export interface Holding {
  ticker: string;         // NSE symbol e.g. 'RELIANCE'
  quantity: number;
  avgBuyPrice: number;    // In INR
  sector: string;
}


export interface UserProfile {
  holdings: Holding[];
  riskProfile: RiskProfile;
  ageGroup: '18-25' | '26-35' | '36-50' | '50+';
  investmentGoal: 'wealth_creation' | 'retirement' | 'short_term' | 'income';
  mode: UserMode;
  onboarded: boolean;
}


export interface StockData {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  high52w: number;

  low52w: number;
  volume: number;
  fetchedAt: string;      // ISO timestamp
  source: 'NSE' | 'yfinance';
  confidence: 'high' | 'medium' | 'low';
}


export interface Fundamentals {
  ticker: string;
  pe: number | null;
  pb: number | null;
  roe: number | null;
  debtToEquity: number | null;
  promoterHolding: number | null;
  fiis: number | null;
  marketCap: string | null;
  fetchedAt: string;
  source: 'screener.in';
}


export interface SourceCitation {
  label: string;         // e.g. 'NSE Live' or 'BSE Filing Q3 FY25'
  timestamp: string;     // Human readable
  url?: string;
}


export interface ReasoningStep {
  icon: string;          // emoji: 🔍 📊 🧠 📰 ✍️
  label: string;
  status: 'pending' | 'running' | 'done';
}


export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;          // Extended thinking content
  citations?: SourceCitation[];
  contrarian?: string;         // Bear case content

  steps?: ReasoningStep[];     // Chain of thought steps shown
  timestamp: Date;
}


export interface DecisionLog {
  id: string;
  question: string;
  decision: string;
  biasDetected?: string;
  ticker?: string;
  priceAtTime: number;
  timestamp: Date;
}

