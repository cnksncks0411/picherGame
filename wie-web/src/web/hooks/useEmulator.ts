import { useCallback, useEffect, useRef } from "react";

import { WieWeb } from "../lib/wasm";

/** A slice faster than this did no work: every guest task is sleeping. */
const IDLE_SLICE_MS = 1;

/**
 * The emulator's executor runs for a hardcoded ~8ms per update(), so slice
 * count is what really decides how much guest time fits in one animation
 * frame: 1 slice leaves the guest idle for half the frame, 2 slices come close
 * to saturating the main thread. Overridable as `?slices=N&budget=M` so the
 * trade-off can be measured on a real game rather than guessed at.
 */
const readTuning = () => {
  const params = new URLSearchParams(window.location.search);
  const slices = Number(params.get("slices"));
  const budget = Number(params.get("budget"));

  return {
    maxSlices: Number.isInteger(slices) && slices >= 1 && slices <= 8 ? slices : 2,
    budgetMs: Number.isFinite(budget) && budget > 0 && budget <= 100 ? budget : 14,
  };
};

export interface EmulatorStats {
  /** Animation frames delivered per second. */
  fps: number;
  /** Mean wall-clock ms spent inside emulator slices per frame. */
  emulatorMs: number;
  /** Mean emulator slices run per frame (1 = executor-limited, 2 = budget-limited). */
  slicesPerFrame: number;
  /** Share of slices that did real work rather than returning idle. */
  workingRatio: number;
}

interface EmulatorOptions {
  filename: string;
  archive: Uint8Array;
  fontData: Uint8Array;
  onError: (error: unknown) => void;
}

/**
 * Owns one WieWeb instance for the lifetime of the player view: constructs it
 * against the canvas, drives tick() from requestAnimationFrame, and frees the
 * wasm memory on unmount.
 */
export const useEmulator = ({ filename, archive, fontData, onError }: EmulatorOptions) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const emulatorRef = useRef<WieWeb>(null);
  const statsRef = useRef<EmulatorStats>({ fps: 0, emulatorMs: 0, slicesPerFrame: 0, workingRatio: 0 });

  // Kept in a ref so a new callback identity never restarts the emulator.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.width = 240;
    canvas.height = 320;

    let emulator: WieWeb;
    try {
      emulator = new WieWeb(filename, archive, canvas, fontData);
    } catch (error) {
      onErrorRef.current(error);
      return;
    }
    emulatorRef.current = emulator;

    const { maxSlices, budgetMs } = readTuning();
    let frame = 0;
    let running = true;
    let windowStart = performance.now();
    let windowFrames = 0;
    let windowEmulatorMs = 0;
    let windowSlices = 0;
    let windowWorkingSlices = 0;
    const update = () => {
      if (!running) {
        return;
      }

      // Each update() runs the emulator's task executor for a fixed ~8ms slice,
      // so one call per animation frame leaves the guest idle for roughly half
      // of every frame. Run extra slices while the frame budget allows.
      //
      // A slice that returns almost immediately means every guest task is
      // sleeping and none is due yet. Stop there: looping on an idle executor
      // would busy-wait through the rest of the budget for no work at all.
      const start = performance.now();
      try {
        for (let slice = 0; slice < maxSlices; slice += 1) {
          const sliceStart = performance.now();
          emulator.update();
          const sliceMs = performance.now() - sliceStart;
          windowSlices += 1;
          if (sliceMs < IDLE_SLICE_MS) {
            break;
          }
          windowWorkingSlices += 1;
          if (performance.now() - start >= budgetMs) {
            break;
          }
        }
      } catch (error) {
        running = false;
        onErrorRef.current(error);
        return;
      }
      windowFrames += 1;
      windowEmulatorMs += performance.now() - start;
      const elapsed = performance.now() - windowStart;
      if (elapsed >= 500) {
        statsRef.current = {
          fps: (windowFrames * 1000) / elapsed,
          emulatorMs: windowEmulatorMs / windowFrames,
          slicesPerFrame: windowSlices / windowFrames,
          workingRatio: windowSlices === 0 ? 0 : windowWorkingSlices / windowSlices,
        };
        windowStart = performance.now();
        windowFrames = 0;
        windowEmulatorMs = 0;
        windowSlices = 0;
        windowWorkingSlices = 0;
      }

      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      emulatorRef.current = null;
      emulator.free();
    };
  }, [filename, archive, fontData]);

  const keyDown = useCallback((key: string) => emulatorRef.current?.key_down(key), []);
  const keyUp = useCallback((key: string) => emulatorRef.current?.key_up(key), []);

  return { canvasRef, keyDown, keyUp, statsRef };
};
