import { create } from "zustand";

// Which inline editor panel is open on the budget page. Kept in a small
// client store because the toggle buttons and the panels live in separate
// component subtrees of a mostly server-rendered page.
type Panel = "none" | "transaction" | "budget" | "goal";

interface BudgetUiState {
  panel: Panel;
  setPanel: (panel: Panel) => void;
  togglePanel: (panel: Exclude<Panel, "none">) => void;
}

export const useBudgetUi = create<BudgetUiState>((set) => ({
  panel: "none",
  setPanel: (panel) => set({ panel }),
  togglePanel: (panel) =>
    set((state) => ({ panel: state.panel === panel ? "none" : panel })),
}));
