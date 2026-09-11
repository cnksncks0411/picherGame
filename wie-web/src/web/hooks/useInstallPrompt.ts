import { useCallback, useEffect, useState } from "react";

/** Not in lib.dom yet; Chromium fires this when the app is installable. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

/**
 * Exposes the browser's own install prompt. Safari never fires the event, so
 * `canInstall` stays false there and iOS users go through Share > Add to Home
 * Screen instead.
 */
export const useInstallPrompt = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      // Chromium only lets us call prompt() later if we suppress the default.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) {
      return;
    }

    // The event is single use, so drop it whatever the user chooses.
    setDeferred(null);
    await deferred.prompt();
  }, [deferred]);

  return { canInstall: deferred !== null, install };
};
