export type ArtifactGenerationState =
  | "idle"
  | "submitting"
  | "generating"
  | "validating"
  | "ready"
  | "downloading"
  | "error"
  | "cancelled"
  | "timeout";

export type ArtifactGenerationEvent =
  | "SUBMIT"
  | "GENERATION_STARTED"
  | "VALIDATION_STARTED"
  | "ARTIFACT_VALIDATED"
  | "DOWNLOAD_STARTED"
  | "DOWNLOAD_FINISHED"
  | "FAIL"
  | "CANCEL"
  | "TIMEOUT"
  | "RESET";

export function reduceArtifactState(
  state: ArtifactGenerationState,
  event: ArtifactGenerationEvent,
): ArtifactGenerationState {
  if (event === "RESET") return "idle";
  if (event === "FAIL") return "error";
  if (event === "CANCEL") return "cancelled";
  if (event === "TIMEOUT") return "timeout";
  if (state === "idle" && event === "SUBMIT") return "submitting";
  if (state === "submitting" && event === "GENERATION_STARTED") return "generating";
  if (state === "generating" && event === "VALIDATION_STARTED") return "validating";
  if (state === "validating" && event === "ARTIFACT_VALIDATED") return "ready";
  if (state === "ready" && event === "DOWNLOAD_STARTED") return "downloading";
  if (state === "downloading" && event === "DOWNLOAD_FINISHED") return "ready";
  return state;
}

export function canDownloadArtifact(state: ArtifactGenerationState): boolean {
  return state === "ready";
}
