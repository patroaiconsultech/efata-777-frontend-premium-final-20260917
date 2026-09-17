import type { PythonRuntimeCapability } from "./contracts";

export function canExecutePremiumPython(
  capability: PythonRuntimeCapability,
): boolean {
  return (
    capability.supported === true &&
    capability.enabled === true &&
    capability.availableNow === true &&
    capability.runtime === "external_isolated_sandbox" &&
    capability.runtimeProved === true &&
    capability.premiumQualified === true &&
    capability.production_eligible === true
  );
}

export function isLegacyPythonRuntime(
  capability: PythonRuntimeCapability,
): boolean {
  return capability.runtime === "legacy_same_host_subprocess";
}

export function shouldOfferLegacyFallback(): false {
  return false;
}
