import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type SelectionState = "EMPTY" | "SELECTED" | "INVALIDATED";

export type RequestedAgentTarget = {
  agentId: string;
  technicalTarget: string;
  displayName: string;
};

type SelectedAgentContextValue = {
  requestedTarget: RequestedAgentTarget | null;
  selectionState: SelectionState;
  selectRequestedTarget: (target: RequestedAgentTarget) => void;
  invalidateRequestedTarget: () => void;
  clearRequestedTarget: () => void;
};

const SelectedAgentContext = createContext<SelectedAgentContextValue | null>(null);

export function SelectedAgentProvider({ children }: { children: ReactNode }) {
  const [requestedTarget, setRequestedTarget] = useState<RequestedAgentTarget | null>(null);
  const [selectionState, setSelectionState] = useState<SelectionState>("EMPTY");

  const value = useMemo<SelectedAgentContextValue>(() => ({
    requestedTarget,
    selectionState,
    selectRequestedTarget(target) {
      setRequestedTarget(target);
      setSelectionState("SELECTED");
    },
    invalidateRequestedTarget() {
      setSelectionState("INVALIDATED");
    },
    clearRequestedTarget() {
      setRequestedTarget(null);
      setSelectionState("EMPTY");
    },
  }), [requestedTarget, selectionState]);

  return <SelectedAgentContext.Provider value={value}>{children}</SelectedAgentContext.Provider>;
}

export function useSelectedAgent() {
  const value = useContext(SelectedAgentContext);
  if (!value) throw new Error("useSelectedAgent must be used inside SelectedAgentProvider");
  return value;
}
