import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { DragEvent } from "react";

import { Dialog } from "./Dialog";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  /** Resolves to a per-file failure list; empty means everything imported. */
  onImport: (files: File[]) => Promise<string[]>;
}

export const ImportDialog = ({ open, onClose, onImport }: ImportDialogProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [status, setStatus] = useState("");
  const [failed, setFailed] = useState(false);

  const importFiles = async (files: File[]) => {
    if (files.length === 0 || busy) {
      return;
    }

    setBusy(true);
    setFailed(false);
    setStatus(`${files.length}개 앱 파일을 확인하는 중입니다.`);
    try {
      const failures = await onImport(files);
      if (failures.length === 0) {
        setStatus("");
        onClose();
      } else {
        setFailed(true);
        setStatus(`추가하지 못한 파일: ${failures.join(" / ")}`);
      }
    } catch (error) {
      setFailed(true);
      setStatus(`앱을 추가할 수 없습니다. ${String(error)}`);
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes("Files")) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = busy ? "none" : "copy";
    setDropActive(!busy);
  };

  return (
    <Dialog open={open} title="앱 추가" onClose={onClose}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={event => {
          if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
            setDropActive(false);
          }
        }}
        onDrop={event => {
          event.preventDefault();
          setDropActive(false);
          void importFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <p>WIPI ZIP 또는 J2ME JAR 파일을 선택하거나 이 창에 끌어다 놓으세요.</p>
        <button
          className={dropActive ? "primary-command drop-active" : "primary-command"}
          type="button"
          disabled={busy}
          autoFocus
          onClick={() => inputRef.current?.click()}
        >
          <Upload />
          <span>파일 선택</span>
        </button>
        <p className={failed ? "dialog-status error" : "dialog-status"} role="status" aria-live="polite">
          {status}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,.jar,application/zip,application/java-archive"
          multiple
          hidden
          onChange={event => void importFiles(Array.from(event.target.files ?? []))}
        />
      </div>
    </Dialog>
  );
};
