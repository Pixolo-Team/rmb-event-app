"use client";

import { useState } from "react";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  danger = true,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [closing, setClosing] = useState(false);

  function close(after: () => void) {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      after();
    }, 200);
  }

  if (!open) return null;

  return (
    <div
      className={`photo-modal-overlay${closing ? " closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={() => close(onCancel)}
    >
      <div className="photo-modal-card confirm-dialog-card" onClick={(event) => event.stopPropagation()}>
        <h1 id="confirm-dialog-title" className="settings-title">
          {title}
        </h1>
        <p className="settings-copy">{message}</p>
        <div className="photo-modal-actions">
          <button className="photo-modal-secondary" type="button" onClick={() => close(onCancel)}>
            {cancelLabel}
          </button>
          <button
            className={`btn-primary photo-modal-submit${danger ? " confirm-dialog-danger" : ""}`}
            type="button"
            onClick={() => close(onConfirm)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
