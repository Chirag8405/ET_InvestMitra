import { useCallback, useEffect, useMemo, useState } from "react";

import type { Holding, UserProfile } from "../types";

const STORAGE_KEY = "et_user_profile";

export function usePortfolio(): {
  profile: UserProfile | null;
  saveProfile: (profile: UserProfile) => void;
  updateHoldings: (holdings: Holding[]) => void;
  clearProfile: () => void;
  isOnboarded: boolean;
  isReady: boolean;
} {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setProfile(null);
      setIsReady(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as UserProfile;
      setProfile(parsed);
    } catch {
      setProfile(null);
    } finally {
      setIsReady(true);
    }
  }, []);

  const saveProfile = useCallback((nextProfile: UserProfile) => {
    setProfile(nextProfile);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile));
    }
  }, []);

  const updateHoldings = useCallback((holdings: Holding[]) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const updated: UserProfile = { ...prev, holdings };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const clearProfile = useCallback(() => {
    setProfile(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const isOnboarded = useMemo(() => Boolean(profile?.onboarded), [profile]);

  return {
    profile,
    saveProfile,
    updateHoldings,
    clearProfile,
    isOnboarded,
    isReady,
  };
}
