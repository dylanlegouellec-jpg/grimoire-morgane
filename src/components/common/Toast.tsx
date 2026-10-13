import type { ToastState } from "../../hooks/useToast";

interface ToastProps {
  toast?: ToastState | null;
  onHide?: () => void;
}

/** Message éphémère en bas d'écran (voir hooks/useToast.ts), avec un bouton d'action facultatif (« Annuler »). */
export default function Toast({ toast, onHide }: ToastProps) {
  return (
    <div role="status" aria-live="polite">
      {toast && (
        <div className={`toast${toast.action ? " toast-with-action" : ""}`}>
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                toast.action?.onAction();
                onHide?.();
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
