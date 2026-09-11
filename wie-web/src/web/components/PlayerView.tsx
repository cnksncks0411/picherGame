import { ArrowLeft, Settings } from "lucide-react";
import { useEffect } from "react";

import { useEmulator } from "../hooks/useEmulator";
import { Keypad } from "./Keypad";
import { StatsOverlay, statsEnabled } from "./StatsOverlay";
import { KEY_MAP } from "../lib/keys";
import type { AppMetadata } from "../lib/appLibraryStore";

interface PlayerViewProps {
  app: AppMetadata;
  archive: Uint8Array;
  fontData: Uint8Array;
  dpadOnRight: boolean;
  onExit: () => void;
  onError: (error: unknown) => void;
  onOpenSettings: () => void;
}

export const PlayerView = ({ app, archive, fontData, dpadOnRight, onExit, onError, onOpenSettings }: PlayerViewProps) => {
  const { canvasRef, keyDown, keyUp, statsRef } = useEmulator({
    filename: app.filename,
    archive,
    fontData,
    onError,
  });

  useEffect(() => {
    const inDialog = (target: EventTarget | null) => target instanceof HTMLElement && target.closest("dialog") !== null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (inDialog(event.target)) {
        return;
      }

      const key = KEY_MAP[event.code];
      if (key) {
        event.preventDefault();
        if (!event.repeat) {
          keyDown(key);
        }
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (inDialog(event.target)) {
        return;
      }

      const key = KEY_MAP[event.code];
      if (key) {
        event.preventDefault();
        keyUp(key);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [keyDown, keyUp]);

  return (
    <section className="player-view">
      <header className="player-toolbar">
        <button className="icon-button" type="button" title="라이브러리" aria-label="라이브러리로 돌아가기" onClick={onExit}>
          <ArrowLeft />
        </button>
        <strong className="player-title">{app.title}</strong>
        <button className="icon-button" type="button" title="설정" aria-label="설정" onClick={onOpenSettings}>
          <Settings />
        </button>
      </header>

      <main className="player-main">
        <div className="canvas-wrapper">
          <canvas ref={canvasRef} width={240} height={320} />
          {statsEnabled() && <StatsOverlay statsRef={statsRef} />}
        </div>
        <Keypad onKeyDown={keyDown} onKeyUp={keyUp} dpadOnRight={dpadOnRight} />
      </main>
    </section>
  );
};
