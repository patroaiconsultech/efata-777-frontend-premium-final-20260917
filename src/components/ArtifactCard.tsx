import React from "react";
import type { ArtifactMetadata } from "../api";

type Props = {
  artifact: ArtifactMetadata;
  busy: boolean;
  error: string;
  onDownload: (artifact: ArtifactMetadata) => void;
};

function artifactTypeLabel(mimeType: string): string {
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "Documento Word";
  if (mimeType === "text/plain") return "Texto";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "text/markdown") return "Markdown";
  if (mimeType === "application/json") return "JSON";
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  )
    return "PowerPoint";
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  )
    return "Excel";
  return mimeType;
}

export default function ArtifactCard({
  artifact,
  busy,
  error,
  onDownload,
}: Props) {
  return (
    <article
      className={error ? "artifact-card artifact-card--error" : "artifact-card"}
      aria-labelledby={`artifact-title-${artifact.artifact_id}`}
      aria-busy={busy}
    >
      <div className="artifact-card__icon" aria-hidden="true">
        ↧
      </div>
      <div className="artifact-card__body">
        <span className="artifact-card__eyebrow">
          {artifactTypeLabel(artifact.mime_type)} · v{artifact.version}
        </span>
        <strong id={`artifact-title-${artifact.artifact_id}`}>
          {artifact.filename}
        </strong>
        <span className="artifact-card__status">
          {error ? "Download indisponível" : "Pronto para baixar"}
        </span>
        <span className="artifact-card__integrity" title={artifact.sha256}>
          SHA-256 {artifact.sha256.slice(0, 12)}…
        </span>
        {error ? (
          <span className="artifact-card__error" role="alert">
            {error}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        className="artifact-card__download"
        disabled={busy}
        onClick={() => onDownload(artifact)}
        aria-label={`${error ? "Tentar novamente o download de" : "Baixar"} ${artifact.filename}`}
      >
        {busy ? "Baixando…" : error ? "Tentar novamente" : "Baixar"}
      </button>
    </article>
  );
}
