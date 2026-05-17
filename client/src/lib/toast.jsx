import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Lightweight toast system. Matches the vanilla Toast component's API
// (success / error / info / warn methods) so ported tabs can call
// `useToast().error(...)` without behavior changes.

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children, duration = 4500 }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind, message, opts = {}) => {
      const id = nextId++;
      const t = { id, kind, message };
      setToasts((prev) => [...prev, t]);
      const ttl = opts.duration ?? duration;
      if (ttl > 0) setTimeout(() => dismiss(id), ttl);
      return id;
    },
    [duration, dismiss]
  );

  const api = {
    success: (msg, o) => push('success', msg, o),
    error:   (msg, o) => push('error',   msg, o),
    info:    (msg, o) => push('info',    msg, o),
    warn:    (msg, o) => push('warn',    msg, o),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="toast-container top-right" style={{ maxWidth: 400 }}>
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.kind}`} onClick={() => dismiss(t.id)}>
              {t.message}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Safe fallback so calls before the provider mounts don't crash.
    return {
      success: console.log,
      error:   console.error,
      info:    console.info,
      warn:    console.warn,
      dismiss: () => {},
    };
  }
  return ctx;
}
