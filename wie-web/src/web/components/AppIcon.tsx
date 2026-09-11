import { useEffect, useState } from "react";

import type { AppMetadata } from "../lib/appLibraryStore";

/** Renders the archive's own icon, falling back to the first letter of the title. */
export const AppIcon = ({ app }: { app: AppMetadata }) => {
  const [url, setUrl] = useState<string>();
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (!app.icon) {
      return;
    }

    const objectUrl = URL.createObjectURL(app.icon);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
      setUrl(undefined);
    };
  }, [app.icon]);

  const fallback = Array.from(app.title.trim())[0] ?? "?";

  return (
    <span className="app-icon">
      {url && !broken ? <img alt="" draggable={false} src={url} onError={() => setBroken(true)} /> : fallback}
    </span>
  );
};
