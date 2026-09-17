import React from "react";
import { Link } from "react-router-dom";
import { getPlatformCapability } from "../../capabilities/registry";
import CapabilityCard from "../components/CapabilityCard";
import { canDownloadArtifact, reduceArtifactState } from "../state/artifactLifecycle";
import "../../premium-preview.css";

const formats = [
  ["DOCX", "artifact.docx"],
  ["PDF", "artifact.pdf"],
  ["PPTX", "artifact.pptx"],
  ["XLSX", "artifact.xlsx"],
  ["IMAGE", "artifact.image"],
] as const;

export default function ArtifactPremiumPreview() {
  const validationPreview = reduceArtifactState(
    reduceArtifactState(
      reduceArtifactState(
        reduceArtifactState("idle", "SUBMIT"),
        "GENERATION_STARTED",
      ),
      "VALIDATION_STARTED",
    ),
    "ARTIFACT_VALIDATED",
  );

  return (
    <main className="premium-preview" id="main-content">
      <div className="premium-preview__frame">
        <header className="premium-preview__header">
          <div>
            <span className="premium-kicker">EFATÁ 777 · ARTIFACT GENERATION</span>
            <h1>Capabilities reais, qualificação Premium separada.</h1>
            <p>
              A UI distingue suporte atual, disponibilidade e qualificação Premium.
              Image Generation não é exposto como capacidade ativa.
            </p>
          </div>
          <span className="premium-status premium-status--limited">
            QUALIFICATION
          </span>
        </header>

        <section className="premium-grid premium-grid--plans" aria-label="Capabilities de artifact">
          {formats.map(([title, id]) => (
            <CapabilityCard
              key={id}
              title={title}
              capability={getPlatformCapability(id)}
            />
          ))}
        </section>

        <section className="premium-section">
          <div className="premium-section__heading">
            <div>
              <span className="premium-kicker">LIFECYCLE</span>
              <h2>Pronto só depois de validação terminal.</h2>
            </div>
          </div>
          <article className="premium-card premium-card--wide">
            <ol className="premium-lifecycle">
              <li>idle</li>
              <li>submitting</li>
              <li>generating</li>
              <li>validating</li>
              <li>ready</li>
              <li>downloading</li>
            </ol>
            <p>
              Estados terminais: error, cancelled e timeout. HTTP 200 isolado não promove
              o artifact para ready.
            </p>
            <button type="button" disabled={!canDownloadArtifact(validationPreview)}>
              Download somente após ready
            </button>
          </article>
        </section>

        <section className="premium-section">
          <div className="premium-section__heading">
            <div>
              <span className="premium-kicker">DOWNLOAD AUTHORITY</span>
              <h2>Artifact metadata validada pelo backend governa o download.</h2>
            </div>
          </div>
          <article className="premium-card premium-card--wide">
            <p>
              O frontend não inventa artifact_id, ownership, tenant ou status. O fluxo atual
              continua usando metadata terminal canônica e download autenticado por cookie.
            </p>
          </article>
        </section>

        <footer className="premium-preview__footer">
          <Link className="premium-link" to="/app">Voltar à Plataforma</Link>
        </footer>
      </div>
    </main>
  );
}
