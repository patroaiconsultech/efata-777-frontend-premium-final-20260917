import { canExecutePremiumPython } from "./capability";
import type { PythonRuntimeCapability } from "./contracts";

export type PythonRuntimeOperationalState =
  | "CAPABILITY_UNSUPPORTED"
  | "CAPABILITY_DISABLED"
  | "RUNTIME_UNAVAILABLE"
  | "RUNTIME_UNPROVED"
  | "PREMIUM_NOT_QUALIFIED"
  | "PRODUCTION_INELIGIBLE"
  | "READY";

export type PythonRuntimeStatusView = {
  operationalState: PythonRuntimeOperationalState;
  canExecute: boolean;
  userTitle: string;
  userMessage: string;
  adminStatus: string;
  adminQualification: string;
  adminPremium: string;
};

export function pythonRuntimeOperationalState(
  capability: PythonRuntimeCapability,
): PythonRuntimeOperationalState {
  if (!capability.supported) return "CAPABILITY_UNSUPPORTED";
  if (!capability.enabled) return "CAPABILITY_DISABLED";
  if (
    !capability.availableNow ||
    capability.runtime !== "external_isolated_sandbox"
  ) {
    return "RUNTIME_UNAVAILABLE";
  }
  if (!capability.runtimeProved) return "RUNTIME_UNPROVED";
  if (!capability.premiumQualified) return "PREMIUM_NOT_QUALIFIED";
  if (!capability.production_eligible) return "PRODUCTION_INELIGIBLE";
  return "READY";
}

export function pythonRuntimeStatusView(
  capability: PythonRuntimeCapability,
): PythonRuntimeStatusView {
  const operationalState = pythonRuntimeOperationalState(capability);
  const canExecute = canExecutePremiumPython(capability);

  return {
    operationalState,
    canExecute,
    userTitle: "Python Runtime",
    userMessage: canExecute ? "Disponível" : "Indisponível no momento",
    adminStatus:
      capability.statusSource === "frontend_fail_closed_snapshot"
        ? "Runtime status not bound"
        : capability.runtime === "external_isolated_sandbox" &&
            capability.availableNow
          ? "External sandbox available"
          : capability.runtime === "external_isolated_sandbox"
            ? "External sandbox unavailable"
            : "Runtime unavailable",
    adminQualification: capability.runtimeProved
      ? "Runtime-proved"
      : "Not runtime-proved",
    adminPremium: capability.premiumQualified
      ? "Qualified"
      : "Not qualified",
  };
}
