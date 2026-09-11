import { useCallback, useEffect, useState } from "react";

import { DeleteDialog } from "./components/DeleteDialog";
import { HelpDialog } from "./components/HelpDialog";
import { ImportDialog } from "./components/ImportDialog";
import { LibraryView } from "./components/LibraryView";
import { PlayerView } from "./components/PlayerView";
import { SettingsDialog } from "./components/SettingsDialog";
import { AppLibraryStore } from "./lib/appLibraryStore";
import { setMasterVolume, setPcmVolume } from "./lib/midi";
import { extractAppMetadata, initWasm } from "./lib/wasm";
import type { AppMetadata } from "./lib/appLibraryStore";

const FONT_URL = new URL("../../../assets/neodgm.ttf", import.meta.url);
const MIDI_VOLUME_KEY = "wie_volume_midi";
const PCM_VOLUME_KEY = "wie_volume_pcm";
const DPAD_SIDE_KEY = "wie_dpad_on_right";

const readVolume = (key: string) => {
  const raw = localStorage.getItem(key);
  if (raw === null) {
    return 0.5;
  }

  const stored = Number(raw);
  return Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : 0.5;
};

interface RunningApp {
  app: AppMetadata;
  archive: Uint8Array;
}

export const App = () => {
  const [store, setStore] = useState<AppLibraryStore>();
  const [fontData, setFontData] = useState<Uint8Array>();
  const [apps, setApps] = useState<AppMetadata[]>([]);
  const [running, setRunning] = useState<RunningApp | null>(null);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AppMetadata | null>(null);

  const [midiVolume, setMidiVolume] = useState(() => readVolume(MIDI_VOLUME_KEY));
  const [pcmVolume, setPcmVolumeState] = useState(() => readVolume(PCM_VOLUME_KEY));
  const [dpadOnRight, setDpadOnRight] = useState(() => localStorage.getItem(DPAD_SIDE_KEY) === "true");

  useEffect(() => {
    setMasterVolume(midiVolume);
    localStorage.setItem(MIDI_VOLUME_KEY, String(midiVolume));
  }, [midiVolume]);

  useEffect(() => {
    setPcmVolume(pcmVolume);
    localStorage.setItem(PCM_VOLUME_KEY, String(pcmVolume));
  }, [pcmVolume]);

  useEffect(() => {
    localStorage.setItem(DPAD_SIDE_KEY, String(dpadOnRight));
  }, [dpadOnRight]);

  useEffect(() => {
    const load = async () => {
      const [openedStore, fontResponse] = await Promise.all([AppLibraryStore.open(), fetch(FONT_URL), initWasm()]);
      if (!fontResponse.ok) {
        throw new Error(`글꼴을 불러오지 못했습니다. (${fontResponse.status})`);
      }

      setFontData(new Uint8Array(await fontResponse.arrayBuffer()));
      setApps(await openedStore.list());
      setStore(openedStore);
    };

    void load().catch(loadError => setError(`라이브러리를 열 수 없습니다. ${String(loadError)}`));
  }, []);

  const launch = useCallback(
    async (app: AppMetadata) => {
      if (!store || launching) {
        return;
      }

      setLaunching(true);
      try {
        const archive = await store.getArchive(app.id);
        if (!archive) {
          throw new Error("저장된 앱 파일을 찾을 수 없습니다.");
        }
        setRunning({ app, archive });
      } catch (launchError) {
        setError(String(launchError));
      } finally {
        setLaunching(false);
      }
    },
    [store, launching],
  );

  const importFiles = useCallback(
    async (files: File[]) => {
      if (!store) {
        return ["라이브러리를 아직 열지 못했습니다."];
      }

      const known = new Map(apps.map(app => [app.id, app.title]));
      const failures: string[] = [];
      let added = 0;

      for (const file of files) {
        try {
          const name = file.name.toLowerCase();
          if (!name.endsWith(".zip") && !name.endsWith(".jar")) {
            throw new Error("ZIP 또는 JAR 파일이 아닙니다.");
          }

          const archive = new Uint8Array(await file.arrayBuffer());
          const extracted = extractAppMetadata(file.name, archive);
          try {
            const duplicate = known.get(extracted.id);
            if (duplicate) {
              throw new Error(`이미 추가된 앱입니다: ${duplicate}`);
            }

            const icon = extracted.icon;
            const metadata: AppMetadata = {
              id: extracted.id,
              title: extracted.title,
              filename: file.name,
              addedAt: Date.now(),
            };
            if (icon.length > 0) {
              metadata.icon = new Blob([new Uint8Array(icon).buffer]);
            }
            await store.add(metadata, archive);
            known.set(metadata.id, metadata.title);
            added += 1;
          } finally {
            extracted.free();
          }
        } catch (importError) {
          failures.push(`${file.name}: ${importError instanceof Error ? importError.message : String(importError)}`);
        }
      }

      if (added > 0) {
        setApps(await store.list());
      }
      return failures;
    },
    [store, apps],
  );

  const confirmDelete = useCallback(
    async (app: AppMetadata) => {
      if (!store) {
        return;
      }

      try {
        await store.delete(app.id);
        setApps(await store.list());
        setPendingDelete(null);
      } catch (deleteError) {
        setError(`앱을 삭제할 수 없습니다. ${String(deleteError)}`);
      }
    },
    [store],
  );

  const exitToLibrary = useCallback(() => setRunning(null), []);
  const handleEmulatorError = useCallback((emulatorError: unknown) => {
    setRunning(null);
    setError(`앱을 실행할 수 없습니다. ${String(emulatorError)}`);
  }, []);

  return (
    <>
      {running && fontData ? (
        <PlayerView
          app={running.app}
          archive={running.archive}
          fontData={fontData}
          dpadOnRight={dpadOnRight}
          onExit={exitToLibrary}
          onError={handleEmulatorError}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      ) : (
        <LibraryView
          apps={apps}
          launching={launching}
          onLaunch={app => void launch(app)}
          onRequestDelete={setPendingDelete}
          onOpenImport={() => setImportOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenHelp={() => setHelpOpen(true)}
        />
      )}

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button className="secondary-command" type="button" onClick={() => setError(null)}>
            닫기
          </button>
        </div>
      )}

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={importFiles} />
      <SettingsDialog
        open={settingsOpen}
        midiVolume={midiVolume}
        pcmVolume={pcmVolume}
        dpadOnRight={dpadOnRight}
        onMidiVolumeChange={setMidiVolume}
        onPcmVolumeChange={setPcmVolumeState}
        onDpadOnRightChange={setDpadOnRight}
        onClose={() => setSettingsOpen(false)}
      />
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <DeleteDialog app={pendingDelete} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />
    </>
  );
};
