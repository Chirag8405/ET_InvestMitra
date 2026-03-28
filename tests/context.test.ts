import { assembleClaudeContext } from "../lib/context-assembler";
import type { ChatMessage, UserProfile } from "../types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const profile: UserProfile = {
  holdings: [
    { ticker: "RELIANCE", quantity: 10, avgBuyPrice: 100, sector: "Energy" },
    { ticker: "ONGC", quantity: 10, avgBuyPrice: 100, sector: "Energy" },
    { ticker: "HDFCBANK", quantity: 10, avgBuyPrice: 100, sector: "Banking" },
  ],
  riskProfile: "moderate",
  ageGroup: "26-35",
  investmentGoal: "wealth_creation",
  mode: "analyst",
  onboarded: true,
};

const messages: ChatMessage[] = [];

const { contextString } = assembleClaudeContext(
  profile,
  messages,
  null,
  null,
  "Check my portfolio concentration"
);

assert(
  contextString.includes("Sector concentration: Energy 67% | Banking 33%"),
  "Sector concentration percentages are incorrect"
);

assert(
  contextString.includes("WARNING: Energy sector concentration is 67% - above 30% threshold"),
  "Expected concentration warning is missing"
);

console.log("context.test.ts passed");
