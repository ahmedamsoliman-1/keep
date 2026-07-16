"use client";

import { useEffect } from "react";

import { clearActiveVaultKey, touchVaultActivity } from "@/lib/vault-key-store";

export function VaultLifecycle() {
  useEffect(() => {
    const activityEvents = ["keydown", "pointerdown"] as const;
    const handleActivity = () => touchVaultActivity();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") touchVaultActivity();
    };
    const handlePageHide = () => clearActiveVaultKey();

    for (const event of activityEvents) {
      window.addEventListener(event, handleActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      for (const event of activityEvents) {
        window.removeEventListener(event, handleActivity);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  return null;
}
