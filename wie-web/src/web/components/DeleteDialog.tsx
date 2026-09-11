import { useState } from "react";

import { Dialog } from "./Dialog";
import type { AppMetadata } from "../lib/appLibraryStore";

interface DeleteDialogProps {
  app: AppMetadata | null;
  onCancel: () => void;
  onConfirm: (app: AppMetadata) => Promise<void>;
}

export const DeleteDialog = ({ app, onCancel, onConfirm }: DeleteDialogProps) => {
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={app !== null} title="앱 삭제" onClose={onCancel}>
      <p>
        <strong>{app?.title}</strong>을(를) 라이브러리에서 삭제합니다. 저장된 게임 기록도 함께 사라집니다.
      </p>
      <footer className="dialog-actions">
        <button className="secondary-command" type="button" onClick={onCancel}>
          취소
        </button>
        <button
          className="danger-command"
          type="button"
          disabled={busy}
          onClick={async () => {
            if (!app) {
              return;
            }

            setBusy(true);
            try {
              await onConfirm(app);
            } finally {
              setBusy(false);
            }
          }}
        >
          삭제
        </button>
      </footer>
    </Dialog>
  );
};
