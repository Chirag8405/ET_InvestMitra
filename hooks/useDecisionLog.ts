import type { DecisionLog } from "../types";

const LOG_KEY = "et_decision_log";
const MAX_LOGS = 100;

export function useDecisionLog(): {
  addLog: (log: Omit<DecisionLog, "id" | "timestamp">) => void;
  getLogs: () => DecisionLog[];
  getBehavioralScore: () => number;
} {
  const getLogs = (): DecisionLog[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(LOG_KEY) ?? "[]";
      const parsed = JSON.parse(raw) as Array<DecisionLog & { timestamp: string }>;
      return parsed.map((entry) => ({ ...entry, timestamp: new Date(entry.timestamp) }));
    } catch {
      return [];
    }
  };

  const addLog = (log: Omit<DecisionLog, "id" | "timestamp">): void => {
    if (typeof window === "undefined") return;
    const logs = getLogs();
    const newLog: DecisionLog = {
      ...log,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    const updated = [...logs, newLog].slice(-MAX_LOGS);
    window.localStorage.setItem(LOG_KEY, JSON.stringify(updated));
  };

  const getBehavioralScore = (): number => {
    const logs = getLogs();
    if (logs.length === 0) return 0;
    return Math.min(100, logs.length * 5);
  };

  return { addLog, getLogs, getBehavioralScore };
}
