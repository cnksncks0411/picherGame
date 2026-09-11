import { useEffect, useState } from "react";
import type { RefObject } from "react";

import type { EmulatorStats } from "../hooks/useEmulator";

/** Opt-in via ?stats=1 so the diagnostic never costs anything in normal play. */
export const statsEnabled = () => new URLSearchParams(window.location.search).get("stats") === "1";

export const StatsOverlay = ({ statsRef }: { statsRef: RefObject<EmulatorStats> }) => {
  const [stats, setStats] = useState<EmulatorStats>(statsRef.current);

  useEffect(() => {
    const timer = window.setInterval(() => setStats({ ...statsRef.current }), 250);
    return () => window.clearInterval(timer);
  }, [statsRef]);

  const frameBudget = stats.fps > 0 ? 1000 / stats.fps : 0;

  return (
    <div className="stats-overlay">
      <span>{stats.fps.toFixed(1)} fps</span>
      <span>
        emu {stats.emulatorMs.toFixed(1)}ms / {frameBudget.toFixed(1)}ms
      </span>
      <span>{stats.slicesPerFrame.toFixed(2)} slices</span>
      <span>{(stats.workingRatio * 100).toFixed(0)}% busy</span>
    </div>
  );
};
