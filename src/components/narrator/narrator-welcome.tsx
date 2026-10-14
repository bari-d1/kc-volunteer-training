"use client";

import { useEffect } from "react";
import { useNarrator } from "./narrator-context";

/** Dashboard greeting, once per browser session. */
export function NarratorWelcome({ firstName }: { firstName: string }) {
  const { available, say } = useNarrator();
  useEffect(() => {
    if (available) {
      say(`Welcome back, ${firstName}!`, "wave", {
        key: "dashboard-welcome",
        once: "session",
      });
    }
  }, [available, firstName, say]);
  return null;
}
