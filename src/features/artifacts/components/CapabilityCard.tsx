import React from "react";
import type { PlatformCapability } from "../../capabilities/registry";

type Props = {
  title: string;
  capability: PlatformCapability;
};

export default function CapabilityCard({ title, capability }: Props) {
  return (
    <article className="premium-card">
      <div className="premium-capability__top">
        <h3>{title}</h3>
        <span className={`premium-status premium-status--${capability.status}`}>
          {capability.status}
        </span>
      </div>
      <p>{capability.note}</p>
      <dl className="premium-capability__facts">
        <div><dt>Supported</dt><dd>{capability.supported ? "sim" : "não"}</dd></div>
        <div><dt>Available now</dt><dd>{capability.availableNow ? "sim" : "não"}</dd></div>
        <div><dt>Premium qualified</dt><dd>{capability.premiumQualified ? "sim" : "não"}</dd></div>
      </dl>
      <span className="premium-capability__availability" aria-label="Estado da capability">
        {capability.availableNow && capability.enabled
          ? "Disponível no fluxo existente"
          : "Indisponível"}
      </span>
    </article>
  );
}
