export type CapabilityStatus =
  | "live"
  | "limited"
  | "mock"
  | "proposal_only"
  | "not_implemented"
  | "disabled";

export type PlatformCapability = {
  id: string;
  status: CapabilityStatus;
  enabled: boolean;
  supported: boolean;
  availableNow: boolean;
  premiumQualified: boolean;
  runtimeProved?: boolean;
  source: "backend_contract" | "qualification" | "frontend_preview";
  note: string;
};

export const BILLING_ENABLED_DEFAULT = false;
export const REAL_MONEY_ENABLED = false;

type RegistryOptions = {
  developmentPreview?: boolean;
};

const frozenCapabilities: Record<string, PlatformCapability> = {
  "voice.stt_readiness": {
    id: "voice.stt_readiness",
    status: "limited",
    enabled: true,
    supported: true,
    availableNow: true,
    premiumQualified: false,
    runtimeProved: false,
    source: "backend_contract",
    note: "Disponibilidade operacional depende de /api/v2/voice/stt/readiness; browser/provider E2E ainda não provado.",
  },
  "python.premium_execution": {
    id: "python.premium_execution",
    status: "limited",
    enabled: false,
    supported: true,
    availableNow: false,
    premiumQualified: false,
    runtimeProved: false,
    source: "backend_contract",
    note: "Capability suportada, mas execução Premium permanece fail-closed até sandbox externo qualificado.",
  },
  "document_intake.large_paste": { id:"document_intake.large_paste", status:"limited", enabled:false, supported:true, availableNow:false, premiumQualified:false, runtimeProved:false, source:"backend_contract", note:"enabled/availableNow vêm da capability backend; staging ainda não qualificado." },

  "realtime.session": {
    id: "realtime.session", status: "limited", enabled: true, supported: true,
    availableNow: true, premiumQualified: false, runtimeProved: false,
    source: "backend_contract",
    note: "Disponibilidade final depende de /api/v2/realtime/capabilities.",
  },
  "realtime.transcription": {
    id: "realtime.transcription", status: "limited", enabled: true, supported: true,
    availableNow: true, premiumQualified: false, runtimeProved: false,
    source: "backend_contract",
    note: "Partial/final transcript preparado; staging/browser ainda não qualificado.",
  },
  "realtime.canonical_execution": {
    id: "realtime.canonical_execution", status: "limited", enabled: true, supported: true,
    availableNow: true, premiumQualified: false, runtimeProved: false,
    source: "backend_contract",
    note: "O agente selecionado continua proprietário canônico do turno.",
  },
  "realtime.tts": {
    id: "realtime.tts", status: "limited", enabled: true, supported: true,
    availableNow: true, premiumQualified: false, runtimeProved: false,
    source: "backend_contract",
    note: "Saída depende de capability e binding validado pelo backend.",
  },
  "realtime.audio_playback": {
    id: "realtime.audio_playback", status: "limited", enabled: true, supported: true,
    availableNow: true, premiumQualified: false, runtimeProved: false,
    source: "backend_contract",
    note: "Fila segmentada implementada; provider/browser E2E não provado.",
  },
  "voice.catalog": {
    id: "voice.catalog", status: "limited", enabled: true, supported: true,
    availableNow: true, premiumQualified: false, runtimeProved: false,
    source: "backend_contract",
    note: "Catálogo administrativo read-only; catálogo vazio é estado válido.",
  },
  "voice.assignment": {
    id: "voice.assignment", status: "limited", enabled: true, supported: true,
    availableNow: true, premiumQualified: false, runtimeProved: false,
    source: "backend_contract",
    note: "PUT canônico salva DRAFT + UNVALIDATED.",
  },
  "voice.assignment_validation": {
    id: "voice.assignment_validation", status: "limited", enabled: true,
    supported: true, availableNow: true, premiumQualified: false, runtimeProved: false,
    source: "backend_contract",
    note: "Contrato HTTP publicado no backend R2; provider/browser runtime ainda não qualificado.",
  },
  "voice.assignment_activation": {
    id: "voice.assignment_activation", status: "limited", enabled: true,
    supported: true, availableNow: true, premiumQualified: false, runtimeProved: false,
    source: "backend_contract",
    note: "Contrato HTTP publicado no backend R2; ativação real ainda depende de staging/provider E2E.",
  },
  "billing.real_http": {
    id: "billing.real_http",
    status: "proposal_only",
    enabled: false,
    supported: false,
    availableNow: false,
    premiumQualified: false,
    source: "qualification",
    note: "Bloqueado até existir contrato backend canônico Billing no OpenAPI.",
  },
  "billing.real_money": {
    id: "billing.real_money",
    status: "disabled",
    enabled: false,
    supported: false,
    availableNow: false,
    premiumQualified: false,
    source: "qualification",
    note: "Dinheiro real permanece NO-GO.",
  },
  "artifact.docx": {
    id: "artifact.docx",
    status: "limited",
    enabled: true,
    supported: true,
    availableNow: true,
    premiumQualified: false,
    source: "qualification",
    note: "Capacidade atual existente, ainda não qualificada como renderer Premium.",
  },
  "artifact.pdf": {
    id: "artifact.pdf",
    status: "limited",
    enabled: true,
    supported: true,
    availableNow: true,
    premiumQualified: false,
    source: "qualification",
    note: "Capacidade atual existente, ainda não qualificada como renderer Premium.",
  },
  "artifact.pptx": {
    id: "artifact.pptx",
    status: "limited",
    enabled: true,
    supported: true,
    availableNow: true,
    premiumQualified: false,
    source: "qualification",
    note: "Capacidade atual existente, ainda não qualificada como renderer Premium.",
  },
  "artifact.xlsx": {
    id: "artifact.xlsx",
    status: "limited",
    enabled: true,
    supported: true,
    availableNow: true,
    premiumQualified: false,
    source: "qualification",
    note: "Capacidade atual existente, ainda não qualificada como renderer Premium.",
  },
  "artifact.image": {
    id: "artifact.image",
    status: "not_implemented",
    enabled: false,
    supported: false,
    availableNow: false,
    premiumQualified: false,
    source: "qualification",
    note: "Image generation não está implementado no backend canônico atual.",
  },
};

export function getPlatformCapability(
  id: string,
  options: RegistryOptions = {},
): PlatformCapability {
  if (id === "billing.ui_preview") {
    const enabled = Boolean(options.developmentPreview);
    return {
      id,
      status: "mock",
      enabled,
      supported: true,
      availableNow: enabled,
      premiumQualified: false,
      source: "frontend_preview",
      note: enabled
        ? "Preview local MOCK / SANDBOX. Nenhuma integração financeira real."
        : "Preview Billing desabilitado por padrão.",
    };
  }
  const capability = frozenCapabilities[id];
  if (!capability) {
    return {
      id,
      status: "disabled",
      enabled: false,
      supported: false,
      availableNow: false,
      premiumQualified: false,
      source: "qualification",
      note: "Capability não registrada.",
    };
  }
  return capability;
}

export function listPlatformCapabilities(): PlatformCapability[] {
  return Object.values(frozenCapabilities);
}
