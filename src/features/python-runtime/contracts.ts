export type PythonRuntimeKind =
  | "legacy_same_host_subprocess"
  | "external_isolated_sandbox"
  | "unknown";

export type PythonRuntimeStatusSource =
  | "frontend_fail_closed_snapshot"
  | "backend_runtime_contract";

export type PythonRuntimeCapability = {
  runtime: PythonRuntimeKind;
  adapter: string | null;
  statusSource: PythonRuntimeStatusSource;

  supported: boolean;
  enabled: boolean;
  availableNow: boolean;
  runtimeProved: boolean;
  premiumQualified: boolean;

  network_policy: string | null;
  network_enforced: boolean;

  filesystem_policy: string | null;
  filesystem_isolated: boolean;

  cpu_limit_enforced: boolean;
  memory_limit_enforced: boolean;

  production_eligible: boolean;
};

export const PYTHON_RUNTIME_FAIL_CLOSED: PythonRuntimeCapability = {
  runtime: "unknown",
  adapter: null,
  statusSource: "frontend_fail_closed_snapshot",

  supported: true,
  enabled: false,
  availableNow: false,
  runtimeProved: false,
  premiumQualified: false,

  network_policy: null,
  network_enforced: false,

  filesystem_policy: null,
  filesystem_isolated: false,

  cpu_limit_enforced: false,
  memory_limit_enforced: false,

  production_eligible: false,
};
