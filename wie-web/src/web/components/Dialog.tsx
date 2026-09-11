import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Hides the header close button for dialogs that own their own actions. */
  dismissible?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Thin wrapper over <dialog> so open/close stays declarative while the browser
 * still provides the modal backdrop, focus trap and Esc handling.
 */
export const Dialog = ({ open, title, onClose, dismissible = true, className, children }: DialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }

    // Fires for Esc and form method="dialog" submits too, so state stays in sync.
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  return (
    <dialog ref={ref} className={className ? `app-dialog ${className}` : "app-dialog"}>
      <div className="app-dialog-body">
        <header className="dialog-header">
          <h2>{title}</h2>
          {dismissible && (
            <button className="icon-button dialog-close" type="button" title="닫기" aria-label="닫기" onClick={onClose}>
              <X />
            </button>
          )}
        </header>
        {children}
      </div>
    </dialog>
  );
};
