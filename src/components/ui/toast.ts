import { create } from "zustand";

export interface Toast {
  id: number;
  message: string;
  kind: "success" | "error";
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, kind?: Toast["kind"]) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (message, kind = "success") => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, kind }] }));
    // Auto-dismiss; long enough to read, short enough not to nag.
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative helper for use inside event handlers. */
export function toast(message: string, kind: Toast["kind"] = "success") {
  useToasts.getState().push(message, kind);
}
