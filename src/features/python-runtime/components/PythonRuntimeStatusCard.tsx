import type { PythonRuntimeCapability } from "../contracts";
import { pythonRuntimeStatusView } from "../python-runtime-status";

type Props = {
  capability: PythonRuntimeCapability;
  admin?: boolean;
};

const yesNo = (value: boolean) => (value ? "enforced" : "unavailable");

export function PythonRuntimeStatusCard({
  capability,
  admin = false,
}: Props) {
  const status = pythonRuntimeStatusView(capability);

  return (
    <article className="python-runtime-card" data-state={status.operationalState}>
      <div>
        <span>Python Runtime</span>
        <strong>{status.userMessage}</strong>
      </div>

      {admin ? (
        <dl>
          <div>
            <dt>Status</dt>
            <dd>{status.adminStatus}</dd>
          </div>
          <div>
            <dt>Qualification</dt>
            <dd>{status.adminQualification}</dd>
          </div>
          <div>
            <dt>Premium</dt>
            <dd>{status.adminPremium}</dd>
          </div>
          <div>
            <dt>Runtime profile</dt>
            <dd>{capability.runtime === "external_isolated_sandbox" ? capability.adapter || "—" : "—"}</dd>
          </div>
          <div>
            <dt>Network enforcement</dt>
            <dd>{yesNo(capability.network_enforced)}</dd>
          </div>
          <div>
            <dt>Filesystem isolation</dt>
            <dd>{yesNo(capability.filesystem_isolated)}</dd>
          </div>
          <div>
            <dt>CPU hard limit</dt>
            <dd>{yesNo(capability.cpu_limit_enforced)}</dd>
          </div>
          <div>
            <dt>Memory hard limit</dt>
            <dd>{yesNo(capability.memory_limit_enforced)}</dd>
          </div>
        </dl>
      ) : null}

      <button type="button" disabled={!status.canExecute}>
        Run Python Premium
      </button>
    </article>
  );
}
