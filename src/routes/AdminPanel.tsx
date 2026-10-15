import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AdminOverview,
  AdminSecurityStatus,
  AgentDefinition,
  AdminVoiceAssignment,
  AdminVoiceCatalogEntry,
  AgentStudioVersion,
  AdminLLMConfiguration,
  getAdminLLMConfiguration,
  AdminUsageCosts,
  getAdminUsageCosts,
  getAdminAgentStudioVersions,
  createAdminAgentStudioVersion,
  updateAdminAgentStudioDraft,
  createNextAdminAgentStudioVersion,
  submitAdminAgentStudioReview,
  approveAdminAgentStudioVersion,
  previewAdminAgentStudioVersion,
  requestAdminAgentStudioActivation,
  getAdminOverview,
  getAdminSecurityStatus,
  getAdminVoiceAssignments,
  getAdminVoiceCatalog,
  saveAdminVoiceAssignmentDraft,
  validateAdminVoiceAssignment,
  activateAdminVoiceAssignment,
  deactivateAdminVoiceAssignment,
  createAdminVoiceCatalogEntry,
  curateAdminVoiceCatalogEntry,
  deactivateAdminVoiceCatalogEntry,
  previewAdminVoiceCatalogEntry,
  getMe,
  HyperCocreatorMe,
  listAgents,
  listTeams,
  TeamDefinition,
  AdminUser,
  PlatformInvitation,
  getAdminUsers,
  getPlatformInvitations,
  createPlatformInvitation,
  resendPlatformInvitation,
  revokePlatformInvitation,
  updateAdminMembership,
  revokeAdminUserSessions,
} from "../api";
import { PythonRuntimeStatusCard } from "../features/python-runtime/components/PythonRuntimeStatusCard";
import { PYTHON_RUNTIME_FAIL_CLOSED } from "../features/python-runtime/contracts";
import "../admin.css";

export default function AdminPanel() {
  const [me, setMe] = useState<HyperCocreatorMe | null>(null);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [teams, setTeams] = useState<TeamDefinition[]>([]);
  const [security, setSecurity] = useState<AdminSecurityStatus | null>(null);
  const [voiceCatalog, setVoiceCatalog] = useState<AdminVoiceCatalogEntry[]>([]);
  const [voiceAssignments, setVoiceAssignments] = useState<AdminVoiceAssignment[]>([]);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState("");
  const [draftAgentSlug, setDraftAgentSlug] = useState("");
  const [draftVoiceId, setDraftVoiceId] = useState("");
  const [validationEvidenceByAssignment, setValidationEvidenceByAssignment] = useState<Record<string, string>>({});
  const [activationEvidenceByAssignment, setActivationEvidenceByAssignment] = useState<Record<string, string>>({});
  const [voiceActionId, setVoiceActionId] = useState<string | null>(null);
  const [newVoiceName, setNewVoiceName] = useState("");
  const [newVoiceProviderId, setNewVoiceProviderId] = useState("");
  const [newVoiceModel, setNewVoiceModel] = useState("gpt-4o-mini-tts");
  const [catalogEvidenceByVoice, setCatalogEvidenceByVoice] = useState<Record<string, string>>({});
  const [deactivationEvidenceByVoice, setDeactivationEvidenceByVoice] = useState<Record<string, string>>({});
  const [assignmentDeactivationEvidence, setAssignmentDeactivationEvidence] = useState<Record<string, string>>({});
  const [voiceCatalogActionId, setVoiceCatalogActionId] = useState<string | null>(null);
  const [voicePreviewId, setVoicePreviewId] = useState<string | null>(null);
  const voicePreviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const voicePreviewUrlRef = useRef("");
  const [agentStudioVersions, setAgentStudioVersions] = useState<AgentStudioVersion[]>([]);
  const [llmConfiguration, setLLMConfiguration] = useState<AdminLLMConfiguration | null>(null);
  const [llmConfigStatus, setLLMConfigStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [usageCosts, setUsageCosts] = useState<AdminUsageCosts | null>(null);
  const [agentStudioBusy, setAgentStudioBusy] = useState(false);
  const [agentStudioActionId, setAgentStudioActionId] = useState<string | null>(null);
  const [agentStudioNotice, setAgentStudioNotice] = useState("");
  const [agentStudioPreview, setAgentStudioPreview] = useState("");
  const [editingAgentVersionId, setEditingAgentVersionId] = useState<string | null>(null);
  const [agentStudioEvidence, setAgentStudioEvidence] = useState<Record<string, string>>({});
  const [agentDraft, setAgentDraft] = useState({
    agent_slug: "",
    display_name: "",
    canonical_name: "",
    role_label: "",
    department: "",
    description: "",
    system_instruction: "",
    provider: "openai",
    model_name: "",
    temperature: "0.20",
    daily_budget_usd: "",
    monthly_budget_usd: "",
  });
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [platformInvitations, setPlatformInvitations] = useState<PlatformInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [accessBusy, setAccessBusy] = useState(false);
  const [accessActionId, setAccessActionId] = useState<string | null>(null);
  const [accessNotice, setAccessNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const profile = await getMe();
        if (!active) return;
        setMe(profile);
        if (!profile.admin_access) {
          setError("Acesso administrativo não autorizado.");
          return;
        }
        // Non-blocking: a backend without the read-only endpoint must not
        // break existing admin functions during staggered deployments.
        void getAdminLLMConfiguration()
          .then((result) => {
            if (!active) return;
            setLLMConfiguration(result);
            setLLMConfigStatus("ready");
          })
          .catch(() => {
            if (!active) return;
            setLLMConfiguration(null);
            setLLMConfigStatus("unavailable");
          });
        const [
          overview,
          catalog,
          teamCatalog,
          securityStatus,
          voices,
          assignments,
          users,
          invitations,
          studioVersions,
          costs,
        ] = await Promise.all([
          getAdminOverview(),
          listAgents(),
          listTeams(),
          getAdminSecurityStatus(),
          getAdminVoiceCatalog(),
          getAdminVoiceAssignments(),
          getAdminUsers(),
          getPlatformInvitations(),
          getAdminAgentStudioVersions(),
          getAdminUsageCosts(30),
        ]);
        if (!active) return;
        setData(overview);
        setAgents(catalog);
        setTeams(teamCatalog);
        setSecurity(securityStatus);
        setVoiceCatalog(voices);
        setVoiceAssignments(assignments);
        setAdminUsers(users);
        setPlatformInvitations(invitations);
        setAgentStudioVersions(studioVersions);
        setUsageCosts(costs);
        setDraftAgentSlug((current) => current || catalog[0]?.slug || "");
        setDraftVoiceId((current) => current || voices[0]?.id || "");
      } catch {
        if (active) setError("Não foi possível carregar a visão administrativa.");
      }
    };
    void load();
    return () => {
      active = false;
      const audio = voicePreviewAudioRef.current;
      if (audio) audio.pause();
      if (voicePreviewUrlRef.current) URL.revokeObjectURL(voicePreviewUrlRef.current);
      voicePreviewAudioRef.current = null;
      voicePreviewUrlRef.current = "";
    };
  }, []);

  const isEvidenceRefValid = (value: string) => {
    const normalized = value.trim();
    return normalized.length >= 8 && normalized.length <= 500;
  };

  const replaceVoiceAssignment = (saved: AdminVoiceAssignment) => {
    setVoiceAssignments((current) => [
      saved,
      ...current.filter((item) => item.id !== saved.id),
    ]);
  };

  const saveVoiceDraft = async () => {
    if (!draftAgentSlug || !draftVoiceId || voiceBusy) return;
    setVoiceBusy(true);
    setVoiceNotice("");
    try {
      const saved = await saveAdminVoiceAssignmentDraft(draftAgentSlug, {
        voice_catalog_id: draftVoiceId,
        locale: "pt-BR",
        delivery_modes: ["REALTIME_STREAM", "MESSAGE_PLAYBACK"],
      });
      replaceVoiceAssignment(saved);
      setVoiceNotice(
        "Configuração salva como rascunho. Validação do provider ainda necessária.",
      );
    } catch {
      setVoiceNotice("Não foi possível salvar o rascunho de voz.");
    } finally {
      setVoiceBusy(false);
    }
  };

  const validateVoiceAssignment = async (assignment: AdminVoiceAssignment) => {
    const evidenceRef = validationEvidenceByAssignment[assignment.id]?.trim() || "";
    if (!isEvidenceRefValid(evidenceRef) || voiceActionId) return;
    setVoiceActionId(assignment.id);
    setVoiceNotice("");
    try {
      const saved = await validateAdminVoiceAssignment(assignment.id, {
        validation_status: "VALIDATED",
        evidence_ref: evidenceRef,
      });
      replaceVoiceAssignment(saved);
      setVoiceNotice("Assignment validado. A validação administrativa não prova provider/runtime em staging.");
    } catch {
      setVoiceNotice("Não foi possível validar o assignment.");
    } finally {
      setVoiceActionId(null);
    }
  };

  const activateVoiceAssignment = async (assignment: AdminVoiceAssignment) => {
    const evidenceRef = activationEvidenceByAssignment[assignment.id]?.trim() || "";
    if (!isEvidenceRefValid(evidenceRef) || voiceActionId) return;
    setVoiceActionId(assignment.id);
    setVoiceNotice("");
    try {
      const saved = await activateAdminVoiceAssignment(assignment.id, {
        evidence_ref: evidenceRef,
      });
      replaceVoiceAssignment(saved);
      setVoiceNotice("Assignment ativado no contrato administrativo. Provider/browser runtime continua não provado.");
    } catch {
      setVoiceNotice("Não foi possível ativar o assignment.");
    } finally {
      setVoiceActionId(null);
    }
  };

  const replaceVoiceCatalogEntry = (saved: AdminVoiceCatalogEntry) => {
    setVoiceCatalog((current) => [
      saved,
      ...current.filter((item) => item.id !== saved.id),
    ]);
    setDraftVoiceId((current) => {
      if (current) return current;
      return saved.active && saved.curation_status === "APPROVED" ? saved.id : "";
    });
  };

  const createVoiceCatalogEntry = async () => {
    const displayName = newVoiceName.trim();
    const providerVoiceId = newVoiceProviderId.trim();
    const providerModel = newVoiceModel.trim();
    if (!displayName || !providerVoiceId || !providerModel || voiceBusy) return;
    setVoiceBusy(true);
    setVoiceNotice("");
    try {
      const saved = await createAdminVoiceCatalogEntry({
        provider_key: "openai",
        provider_voice_id: providerVoiceId,
        display_name: displayName,
        provider_model: providerModel,
        source_type: "BUILT_IN",
        license_label: "PROVIDER_TERMS",
        cost_class: "API_USAGE_BILLED",
        catalog_version: "1",
        supported_locales: ["pt-BR"],
        delivery_modes: ["REALTIME_STREAM", "MESSAGE_PLAYBACK"],
      });
      replaceVoiceCatalogEntry(saved);
      setNewVoiceName("");
      setNewVoiceProviderId("");
      setVoiceNotice("Voz adicionada em REVIEW_REQUIRED. Faça preview e registre evidência antes de aprovar.");
    } catch {
      setVoiceNotice("Não foi possível adicionar a voz ao catálogo.");
    } finally {
      setVoiceBusy(false);
    }
  };

  const curateVoiceCatalog = async (
    voice: AdminVoiceCatalogEntry,
    status: "APPROVED" | "REJECTED",
  ) => {
    const evidenceRef = catalogEvidenceByVoice[voice.id]?.trim() || "";
    if (!isEvidenceRefValid(evidenceRef) || voiceCatalogActionId) return;
    setVoiceCatalogActionId(voice.id);
    setVoiceNotice("");
    try {
      const saved = await curateAdminVoiceCatalogEntry(voice.id, {
        curation_status: status,
        evidence_ref: evidenceRef,
      });
      replaceVoiceCatalogEntry(saved);
      setVoiceNotice(
        status === "APPROVED"
          ? "Voz aprovada para assignment governado."
          : "Voz rejeitada. Ela não será elegível para novos assignments.",
      );
    } catch {
      setVoiceNotice("Não foi possível atualizar a curadoria da voz.");
    } finally {
      setVoiceCatalogActionId(null);
    }
  };

  const stopVoicePreview = () => {
    const audio = voicePreviewAudioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    voicePreviewAudioRef.current = null;
    if (voicePreviewUrlRef.current) {
      URL.revokeObjectURL(voicePreviewUrlRef.current);
      voicePreviewUrlRef.current = "";
    }
    setVoicePreviewId(null);
  };

  const previewVoiceCatalog = async (voice: AdminVoiceCatalogEntry) => {
    if (voicePreviewId === voice.id) {
      stopVoicePreview();
      return;
    }
    stopVoicePreview();
    setVoiceCatalogActionId(voice.id);
    setVoiceNotice("");
    try {
      const blob = await previewAdminVoiceCatalogEntry(
        voice.id,
        `Olá. Esta é uma prévia da voz ${voice.display_name} na Plataforma Efatà 777.`,
        "pt-BR",
      );
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      voicePreviewUrlRef.current = objectUrl;
      voicePreviewAudioRef.current = audio;
      setVoicePreviewId(voice.id);
      audio.onended = stopVoicePreview;
      audio.onerror = () => {
        stopVoicePreview();
        setVoiceNotice("A voz foi sintetizada, mas o navegador não conseguiu reproduzir o preview.");
      };
      await audio.play();
    } catch {
      stopVoicePreview();
      setVoiceNotice("Não foi possível gerar o preview dessa voz.");
    } finally {
      setVoiceCatalogActionId(null);
    }
  };

  const deactivateVoiceCatalog = async (voice: AdminVoiceCatalogEntry) => {
    const evidenceRef = deactivationEvidenceByVoice[voice.id]?.trim() || "";
    if (!isEvidenceRefValid(evidenceRef) || voiceCatalogActionId) return;
    setVoiceCatalogActionId(voice.id);
    setVoiceNotice("");
    try {
      const saved = await deactivateAdminVoiceCatalogEntry(voice.id, evidenceRef);
      replaceVoiceCatalogEntry(saved);
      setVoiceNotice("Voz desativada no catálogo. Assignments ativos precisam ser desativados primeiro.");
    } catch {
      setVoiceNotice("Não foi possível desativar a voz. Verifique se ainda existe assignment ativo.");
    } finally {
      setVoiceCatalogActionId(null);
    }
  };

  const deactivateVoiceAssignment = async (assignment: AdminVoiceAssignment) => {
    const evidenceRef = assignmentDeactivationEvidence[assignment.id]?.trim() || "";
    if (!isEvidenceRefValid(evidenceRef) || voiceActionId) return;
    setVoiceActionId(assignment.id);
    setVoiceNotice("");
    try {
      const saved = await deactivateAdminVoiceAssignment(assignment.id, evidenceRef);
      replaceVoiceAssignment(saved);
      setVoiceNotice("Assignment desativado. O resolver canônico voltará ao próximo binding elegível.");
    } catch {
      setVoiceNotice("Não foi possível desativar o assignment.");
    } finally {
      setVoiceActionId(null);
    }
  };

  const replaceAgentStudioVersion = (saved: AgentStudioVersion) => {
    setAgentStudioVersions((current) => [
      saved,
      ...current.filter((item) => item.id !== saved.id),
    ]);
  };

  const resetAgentStudioDraft = () => {
    setEditingAgentVersionId(null);
    setAgentDraft({
      agent_slug: "",
      display_name: "",
      canonical_name: "",
      role_label: "",
      department: "",
      description: "",
      system_instruction: "",
      provider: "openai",
      model_name: "",
      temperature: "0.20",
      daily_budget_usd: "",
      monthly_budget_usd: "",
    });
  };

  const editAgentStudioVersion = (row: AgentStudioVersion) => {
    setEditingAgentVersionId(row.id);
    setAgentDraft({
      agent_slug: row.agent_slug,
      display_name: row.display_name,
      canonical_name: row.canonical_name,
      role_label: row.role_label,
      department: row.department,
      description: row.description,
      system_instruction: row.system_instruction,
      provider: row.provider,
      model_name: row.model_name,
      temperature: String(row.temperature),
      daily_budget_usd: row.daily_budget_usd === null ? "" : String(row.daily_budget_usd),
      monthly_budget_usd: row.monthly_budget_usd === null ? "" : String(row.monthly_budget_usd),
    });
    setAgentStudioPreview("");
    setAgentStudioNotice(`Editando ${row.agent_slug} v${row.version}.`);
  };

  const saveAgentStudioDraft = async () => {
    if (agentStudioBusy) return;
    const slug = agentDraft.agent_slug.trim().toLowerCase();
    const displayName = agentDraft.display_name.trim();
    const canonicalName = agentDraft.canonical_name.trim();
    const modelName = agentDraft.model_name.trim();
    const systemInstruction = agentDraft.system_instruction.trim();
    if (!slug || !displayName || !canonicalName || !modelName || !systemInstruction) {
      setAgentStudioNotice("Preencha slug, nome, nome canônico, modelo e instrução de sistema.");
      return;
    }
    const temperature = Number(agentDraft.temperature);
    if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
      setAgentStudioNotice("Temperature deve estar entre 0 e 2.");
      return;
    }
    const dailyBudget = agentDraft.daily_budget_usd.trim()
      ? Number(agentDraft.daily_budget_usd)
      : null;
    const monthlyBudget = agentDraft.monthly_budget_usd.trim()
      ? Number(agentDraft.monthly_budget_usd)
      : null;
    setAgentStudioBusy(true);
    setAgentStudioNotice("");
    try {
      const body = {
        agent_slug: slug,
        source_kind: "CUSTOM" as const,
        display_name: displayName,
        canonical_name: canonicalName,
        role_label: agentDraft.role_label.trim(),
        department: agentDraft.department.trim(),
        description: agentDraft.description.trim(),
        system_instruction: systemInstruction,
        provider: agentDraft.provider.trim() || "openai",
        model_name: modelName,
        temperature,
        capabilities: {},
        knowledge_config: {},
        daily_budget_usd: dailyBudget,
        monthly_budget_usd: monthlyBudget,
      };
      const saved = editingAgentVersionId
        ? await updateAdminAgentStudioDraft(editingAgentVersionId, body)
        : await createAdminAgentStudioVersion(body);
      replaceAgentStudioVersion(saved);
      setEditingAgentVersionId(saved.id);
      setAgentStudioNotice(
        editingAgentVersionId
          ? "Rascunho atualizado. Nenhuma mudança foi publicada no runtime."
          : "Agente criado em DRAFT. Nenhuma mudança foi publicada no runtime.",
      );
    } catch {
      setAgentStudioNotice("Não foi possível salvar o Agent Studio.");
    } finally {
      setAgentStudioBusy(false);
    }
  };

  const createCanonicalAgentStudioOverride = async (agent: AgentDefinition) => {
    if (agentStudioBusy) return;
    setAgentStudioBusy(true);
    setAgentStudioNotice("");
    try {
      const saved = await createAdminAgentStudioVersion({
        agent_slug: agent.slug,
        source_kind: "CANONICAL_OVERRIDE",
        base_agent_slug: agent.slug,
        display_name: agent.display_name,
        canonical_name: agent.canonical_name || agent.display_name,
        role_label: agent.role_label || "",
        department: agent.department || "",
        description: "",
        system_instruction: `Preserve a identidade canônica e a missão governada de ${agent.display_name}.`,
        provider: "openai",
        model_name: "",
        temperature: 0.2,
        capabilities: {},
        knowledge_config: {},
        daily_budget_usd: null,
        monthly_budget_usd: null,
      });
      replaceAgentStudioVersion(saved);
      editAgentStudioVersion(saved);
      setAgentStudioNotice("Override canônico criado em DRAFT. Defina modelo e instrução antes de enviar para revisão.");
    } catch {
      setAgentStudioNotice("Não foi possível criar o override. Pode já existir uma configuração para este agente.");
    } finally {
      setAgentStudioBusy(false);
    }
  };

  const createNextAgentStudioVersion = async (row: AgentStudioVersion) => {
    if (agentStudioActionId) return;
    setAgentStudioActionId(row.id);
    setAgentStudioNotice("");
    try {
      const saved = await createNextAdminAgentStudioVersion(row.agent_slug);
      replaceAgentStudioVersion(saved);
      editAgentStudioVersion(saved);
      setAgentStudioNotice(`Nova versão v${saved.version} criada como DRAFT.`);
    } catch {
      setAgentStudioNotice("Não foi possível criar nova versão; verifique se já existe um DRAFT/REVIEW aberto.");
    } finally {
      setAgentStudioActionId(null);
    }
  };

  const previewAgentStudio = async (row: AgentStudioVersion) => {
    if (agentStudioActionId) return;
    setAgentStudioActionId(row.id);
    setAgentStudioPreview("");
    try {
      const preview = await previewAdminAgentStudioVersion(row.id);
      setAgentStudioPreview(preview.compiled_system_instruction);
      setAgentStudioNotice(
        `Preview ${preview.agent_slug} v${preview.version}. Ativação runtime: ${preview.activation.reason_code}.`,
      );
    } catch {
      setAgentStudioNotice("Não foi possível gerar o preview do agente.");
    } finally {
      setAgentStudioActionId(null);
    }
  };

  const submitAgentStudioReview = async (row: AgentStudioVersion) => {
    const evidenceRef = agentStudioEvidence[row.id]?.trim() || "";
    if (!isEvidenceRefValid(evidenceRef) || agentStudioActionId) return;
    setAgentStudioActionId(row.id);
    setAgentStudioNotice("");
    try {
      const saved = await submitAdminAgentStudioReview(row.id, evidenceRef);
      replaceAgentStudioVersion(saved);
      setAgentStudioNotice("Versão enviada para REVIEW. Runtime permanece inalterado.");
    } catch {
      setAgentStudioNotice("Não foi possível enviar para revisão. Modelo e system instruction são obrigatórios.");
    } finally {
      setAgentStudioActionId(null);
    }
  };

  const approveAgentStudio = async (row: AgentStudioVersion) => {
    const evidenceRef = agentStudioEvidence[row.id]?.trim() || "";
    if (!isEvidenceRefValid(evidenceRef) || agentStudioActionId) return;
    setAgentStudioActionId(row.id);
    setAgentStudioNotice("");
    try {
      const saved = await approveAdminAgentStudioVersion(row.id, evidenceRef);
      replaceAgentStudioVersion(saved);
      setAgentStudioNotice("Versão APPROVED. Publicação runtime continua bloqueada pelo gate tenant-aware.");
    } catch {
      setAgentStudioNotice("Não foi possível aprovar a versão.");
    } finally {
      setAgentStudioActionId(null);
    }
  };

  const testAgentStudioActivationGate = async (row: AgentStudioVersion) => {
    const evidenceRef = agentStudioEvidence[row.id]?.trim() || "";
    if (!isEvidenceRefValid(evidenceRef) || agentStudioActionId) return;
    setAgentStudioActionId(row.id);
    setAgentStudioNotice("");
    try {
      await requestAdminAgentStudioActivation(row.id, evidenceRef);
      setAgentStudioNotice("Ativação retornou sucesso inesperado; interrompa e audite antes de qualquer deploy.");
    } catch {
      setAgentStudioNotice(
        "Ativação bloqueada como esperado: AGENT_STUDIO_TENANT_AWARE_RUNTIME_NOT_IMPLEMENTED.",
      );
    } finally {
      setAgentStudioActionId(null);
    }
  };

  const refreshAccessPlane = async () => {
    const [users, invitations] = await Promise.all([
      getAdminUsers(),
      getPlatformInvitations(),
    ]);
    setAdminUsers(users);
    setPlatformInvitations(invitations);
  };

  const createUserInvitation = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || accessBusy) return;
    setAccessBusy(true);
    setAccessNotice("");
    try {
      const created = await createPlatformInvitation({ email, role: inviteRole });
      setPlatformInvitations((current) => [
        created,
        ...current.filter((item) => item.invitation_id !== created.invitation_id),
      ]);
      setInviteEmail("");
      setAccessNotice(
        created.delivery_status === "ACCEPTED_BY_PROVIDER"
          ? "Convite aceito pelo provedor de e-mail. Entrega na caixa postal ainda não é presumida."
          : created.delivery_status === "DELIVERY_FAILED"
            ? "Convite criado, mas o provedor não aceitou o envio. Use reenviar após corrigir a configuração."
            : "Convite criado e enfileirado para envio.",
      );
    } catch {
      setAccessNotice("Não foi possível criar o convite de plataforma.");
    } finally {
      setAccessBusy(false);
    }
  };

  const resendUserInvitation = async (invitation: PlatformInvitation) => {
    if (accessActionId) return;
    setAccessActionId(invitation.invitation_id);
    setAccessNotice("");
    try {
      const saved = await resendPlatformInvitation(invitation.invitation_id);
      setPlatformInvitations((current) =>
        current.map((item) =>
          item.invitation_id === saved.invitation_id ? saved : item,
        ),
      );
      setAccessNotice(
        saved.delivery_status === "ACCEPTED_BY_PROVIDER"
          ? "Reenvio aceito pelo provedor. Isso ainda não constitui prova de entrega."
          : "Tentativa de reenvio registrada sem falso sucesso.",
      );
    } catch {
      setAccessNotice("Não foi possível reenviar o convite.");
    } finally {
      setAccessActionId(null);
    }
  };

  const revokeUserInvitation = async (invitation: PlatformInvitation) => {
    if (accessActionId) return;
    setAccessActionId(invitation.invitation_id);
    setAccessNotice("");
    try {
      const saved = await revokePlatformInvitation(invitation.invitation_id);
      setPlatformInvitations((current) =>
        current.map((item) =>
          item.invitation_id === saved.invitation_id ? saved : item,
        ),
      );
      setAccessNotice("Convite revogado. O token não poderá ser consumido.");
    } catch {
      setAccessNotice("Não foi possível revogar o convite.");
    } finally {
      setAccessActionId(null);
    }
  };

  const toggleUserActive = async (user: AdminUser) => {
    if (accessActionId) return;
    setAccessActionId(user.user_id);
    setAccessNotice("");
    try {
      await updateAdminMembership(user.user_id, { active: !user.active });
      await refreshAccessPlane();
      setAccessNotice(user.active ? "Usuário suspenso." : "Usuário reativado.");
    } catch {
      setAccessNotice("Não foi possível alterar o status do usuário.");
    } finally {
      setAccessActionId(null);
    }
  };

  const revokeSessions = async (user: AdminUser) => {
    if (accessActionId) return;
    setAccessActionId(user.user_id);
    setAccessNotice("");
    try {
      const result = await revokeAdminUserSessions(user.user_id);
      setAccessNotice(`${result.revoked_sessions} sessão(ões) revogada(s).`);
    } catch {
      setAccessNotice("Não foi possível revogar as sessões do usuário.");
    } finally {
      setAccessActionId(null);
    }
  };

  const deliveryLabel = (value: PlatformInvitation["delivery_status"]) => {
    if (value === "ACCEPTED_BY_PROVIDER") return "Aceito pelo provedor";
    if (value === "DELIVERY_FAILED") return "Falha de envio";
    return "Pendente";
  };

  if (error) {
    return (
      <main className="admin-shell">
        <h1>403</h1>
        <p>{error}</p>
        <Link to="/app">Voltar à Plataforma</Link>
      </main>
    );
  }

  return (
    <main className="admin-shell" id="main-content">
      <header>
        <div>
          <span>PLATAFORMA · GOVERNANÇA</span>
          <h1>Painel Admin</h1>
          <p>{me?.email}</p>
        </div>
        <Link to="/app">Voltar à Plataforma</Link>
      </header>

      {!data ? (
        <p>Carregando visão administrativa…</p>
      ) : (
        <>
          <section className="admin-grid">
            <article><span>Usuários ativos</span><strong>{data.users}</strong></article>
            <article><span>Co-Criadores</span><strong>{data.co_creator_profiles}</strong></article>
            <article><span>Conversas</span><strong>{data.threads}</strong></article>
            <article><span>Mensagens</span><strong>{data.messages}</strong></article>
            <article><span>Agentes no catálogo</span><strong>{agents.length}</strong></article>
            <article><span>Teams</span><strong>{teams.length}</strong></article>
          </section>

          <section className="admin-section" aria-labelledby="llm-config-title">
            <div className="admin-section__heading">
              <div>
                <span>LLM · CONFIGURAÇÃO DO BACKEND</span>
                <h2 id="llm-config-title">Modelo padrão — somente leitura</h2>
              </div>
              <small>Modelo por agente permanece sujeito ao gate de ativação do Agent Studio.</small>
            </div>
            {llmConfigStatus === "ready" && llmConfiguration ? (
              <>
                <div className="admin-grid">
                  <article>
                    <span>Provedor principal</span>
                    <strong>{llmConfiguration.primary_provider}</strong>
                  </article>
                  <article>
                    <span>Modelo configurado</span>
                    <strong className="admin-value">
                      {llmConfiguration.configured_model || "Não configurado"}
                    </strong>
                  </article>
                  <article>
                    <span>Origem</span>
                    <strong>Configuração do processo</strong>
                  </article>
                </div>
                <div className="admin-governance-note">
                  <p>
                    Valor resolvido pelo backend (ENV ou padrão do código). Não é
                    comprovação do modelo utilizado em uma execução específica.
                    Trocas pelo painel ainda não estão habilitadas.
                  </p>
                </div>
              </>
            ) : (
              <p role="status">
                {llmConfigStatus === "loading"
                  ? "Consultando configuração LLM do backend…"
                  : "Configuração LLM indisponível. Nenhum modelo foi confirmado."}
              </p>
            )}
          </section>

          <section className="admin-section" aria-labelledby="access-plane-title">
            <div className="admin-section__heading">
              <div>
                <span>IDENTIDADE · TENANT · ONBOARDING</span>
                <h2 id="access-plane-title">Access Plane Premium</h2>
              </div>
              <small>Convites de plataforma são independentes dos convites de conversa.</small>
            </div>

            <div className="admin-agent-grid">
              <article className="admin-agent-card">
                <strong>Convidar novo usuário</strong>
                <label>
                  E-mail
                  <input
                    type="email"
                    autoComplete="off"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="usuario@empresa.com"
                  />
                </label>
                <label>
                  Papel inicial
                  <select
                    value={inviteRole}
                    onChange={(event) =>
                      setInviteRole(event.target.value === "admin" ? "admin" : "member")
                    }
                  >
                    <option value="member">Membro</option>
                    <option value="admin">Admin — somente se autorizado no backend</option>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={accessBusy || !inviteEmail.trim()}
                  onClick={() => void createUserInvitation()}
                >
                  {accessBusy ? "Criando…" : "Criar e enviar convite"}
                </button>
                <small>
                  “Aceito pelo provedor” não significa entregue, aberto ou clicado.
                </small>
              </article>

              {platformInvitations.map((invitation) => (
                <article className="admin-agent-card" key={invitation.invitation_id}>
                  <div className="admin-agent-card__top">
                    <strong>{invitation.invited_email}</strong>
                    <span>{invitation.state}</span>
                  </div>
                  <p>{invitation.role} · {deliveryLabel(invitation.delivery_status)}</p>
                  <small>
                    Geração {invitation.delivery_generation} · {invitation.delivery_attempts} tentativa(s)
                  </small>
                  {invitation.delivery_error_code ? (
                    <small>Erro: {invitation.delivery_error_code}</small>
                  ) : null}
                  {invitation.state === "PENDING" ? (
                    <div className="modal-card__actions">
                      <button
                        type="button"
                        disabled={accessActionId !== null}
                        onClick={() => void resendUserInvitation(invitation)}
                      >
                        Reenviar / reconciliar
                      </button>
                      <button
                        type="button"
                        disabled={accessActionId !== null}
                        onClick={() => void revokeUserInvitation(invitation)}
                      >
                        Revogar
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="admin-section__heading">
              <div>
                <span>MEMBERSHIPS · SESSÕES</span>
                <h3>Usuários do tenant</h3>
              </div>
            </div>
            <div className="admin-agent-grid">
              {adminUsers.map((user) => (
                <article className="admin-agent-card" key={user.user_id}>
                  <div className="admin-agent-card__top">
                    <strong>{user.display_name}</strong>
                    <span>{user.active ? "ATIVO" : "SUSPENSO"}</span>
                  </div>
                  <p>{user.email}</p>
                  <small>{user.role} · {user.email_verified ? "e-mail verificado" : "e-mail não verificado"}</small>
                  <div className="modal-card__actions">
                    <button
                      type="button"
                      disabled={accessActionId !== null || user.user_id === me?.user_id}
                      onClick={() => void toggleUserActive(user)}
                    >
                      {user.active ? "Suspender" : "Reativar"}
                    </button>
                    <button
                      type="button"
                      disabled={accessActionId !== null}
                      onClick={() => void revokeSessions(user)}
                    >
                      Revogar sessões
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {accessNotice ? <p aria-live="polite">{accessNotice}</p> : null}
          </section>

                    <section className="admin-section" aria-labelledby="python-runtime-title">
            <div className="admin-section__heading">
              <div>
                <span>RUNTIME · QUALIFICAÇÃO</span>
                <h2 id="python-runtime-title">Python Runtime</h2>
              </div>
            </div>
            <PythonRuntimeStatusCard capability={PYTHON_RUNTIME_FAIL_CLOSED} admin />
            <p className="admin-note">
              Status conservador do frontend: nenhuma execução Python é habilitada sem contrato runtime externo qualificado.
            </p>
          </section>

<section className="admin-section">
            <div className="admin-section__heading">
              <div>
                <span>CATÁLOGO INTERNO</span>
                <h2>Agentes disponíveis para administração</h2>
              </div>
              <small>O usuário comum continua vendo somente seu Co-Criador.</small>
            </div>
            <div className="admin-agent-grid">
              {agents.map((agent) => (
                <article className="admin-agent-card" key={agent.slug}>
                  <div className="admin-agent-card__top">
                    <strong>{agent.display_name}</strong>
                    <span>{agent.availability?.state || agent.availability?.chat?.status || "unknown"}</span>
                  </div>
                  <p>{agent.role_label}</p>
                  <small>{agent.department} · {agent.slug}</small>
                  <button
                    type="button"
                    disabled={agentStudioBusy}
                    onClick={() => void createCanonicalAgentStudioOverride(agent)}
                  >
                    Criar configuração governada
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-section" aria-labelledby="agent-studio-title">
            <div className="admin-section__heading">
              <div>
                <span>AGENT STUDIO · DRAFT → REVIEW → APPROVED</span>
                <h2 id="agent-studio-title">Criar e versionar agentes com publicação fail-closed</h2>
              </div>
              <small>Configuração tenant-scoped. O runtime custom permanece bloqueado até o registry ser tenant-aware.</small>
            </div>

            <div className="admin-agent-grid">
              <article className="admin-agent-card">
                <div className="admin-agent-card__top">
                  <strong>{editingAgentVersionId ? "Editar DRAFT" : "Novo agente custom"}</strong>
                  <span>{editingAgentVersionId ? "DRAFT" : "CUSTOM"}</span>
                </div>
                <label>
                  Slug técnico
                  <input
                    value={agentDraft.agent_slug}
                    disabled={Boolean(editingAgentVersionId)}
                    onChange={(event) =>
                      setAgentDraft((current) => ({ ...current, agent_slug: event.target.value }))
                    }
                    placeholder="ex.: estrategista-financeiro"
                    maxLength={80}
                  />
                </label>
                <label>
                  Nome público
                  <input
                    value={agentDraft.display_name}
                    onChange={(event) =>
                      setAgentDraft((current) => ({ ...current, display_name: event.target.value }))
                    }
                    maxLength={160}
                  />
                </label>
                <label>
                  Nome canônico
                  <input
                    value={agentDraft.canonical_name}
                    onChange={(event) =>
                      setAgentDraft((current) => ({ ...current, canonical_name: event.target.value }))
                    }
                    maxLength={160}
                  />
                </label>
                <label>
                  Cargo
                  <input
                    value={agentDraft.role_label}
                    onChange={(event) =>
                      setAgentDraft((current) => ({ ...current, role_label: event.target.value }))
                    }
                    maxLength={200}
                  />
                </label>
                <label>
                  Departamento
                  <input
                    value={agentDraft.department}
                    onChange={(event) =>
                      setAgentDraft((current) => ({ ...current, department: event.target.value }))
                    }
                    maxLength={160}
                  />
                </label>
                <label>
                  Descrição
                  <textarea
                    value={agentDraft.description}
                    onChange={(event) =>
                      setAgentDraft((current) => ({ ...current, description: event.target.value }))
                    }
                    rows={3}
                    maxLength={4000}
                  />
                </label>
                <label>
                  System instruction
                  <textarea
                    value={agentDraft.system_instruction}
                    onChange={(event) =>
                      setAgentDraft((current) => ({ ...current, system_instruction: event.target.value }))
                    }
                    rows={7}
                    maxLength={50000}
                  />
                </label>
                <label>
                  Provider
                  <input
                    value={agentDraft.provider}
                    onChange={(event) =>
                      setAgentDraft((current) => ({ ...current, provider: event.target.value }))
                    }
                    maxLength={80}
                  />
                </label>
                <label>
                  Modelo
                  <input
                    value={agentDraft.model_name}
                    onChange={(event) =>
                      setAgentDraft((current) => ({ ...current, model_name: event.target.value }))
                    }
                    placeholder="modelo aprovado para o tenant"
                    maxLength={160}
                  />
                </label>
                <label>
                  Temperature
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.05"
                    value={agentDraft.temperature}
                    onChange={(event) =>
                      setAgentDraft((current) => ({ ...current, temperature: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Budget diário USD
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={agentDraft.daily_budget_usd}
                    onChange={(event) =>
                      setAgentDraft((current) => ({ ...current, daily_budget_usd: event.target.value }))
                    }
                    placeholder="opcional"
                  />
                </label>
                <label>
                  Budget mensal USD
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={agentDraft.monthly_budget_usd}
                    onChange={(event) =>
                      setAgentDraft((current) => ({ ...current, monthly_budget_usd: event.target.value }))
                    }
                    placeholder="opcional"
                  />
                </label>
                <div className="modal-card__actions">
                  <button
                    type="button"
                    disabled={agentStudioBusy}
                    onClick={() => void saveAgentStudioDraft()}
                  >
                    {agentStudioBusy ? "Salvando…" : "Salvar DRAFT"}
                  </button>
                  <button type="button" disabled={agentStudioBusy} onClick={resetAgentStudioDraft}>
                    Limpar formulário
                  </button>
                </div>
                <small>Nenhum DRAFT/REVIEW/APPROVED criado aqui altera o runtime canônico.</small>
              </article>

              {agentStudioVersions.map((row) => (
                <article className="admin-agent-card" key={row.id}>
                  <div className="admin-agent-card__top">
                    <strong>{row.display_name}</strong>
                    <span>{row.lifecycle_state}</span>
                  </div>
                  <p>{row.role_label || "Sem cargo"} · {row.department || "Sem departamento"}</p>
                  <small>{row.agent_slug} · {row.source_kind} · v{row.version}</small>
                  <small>{row.provider} · {row.model_name || "modelo pendente"} · T={row.temperature}</small>
                  <small>
                    Runtime: {row.runtime_enabled ? "ATIVO" : "BLOQUEADO"} ·
                    Budget diário: {row.daily_budget_usd ?? "—"} · mensal: {row.monthly_budget_usd ?? "—"}
                  </small>
                  <div className="modal-card__actions">
                    {row.lifecycle_state === "DRAFT" ? (
                      <button type="button" onClick={() => editAgentStudioVersion(row)}>
                        Editar
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={agentStudioActionId !== null}
                      onClick={() => void previewAgentStudio(row)}
                    >
                      Preview
                    </button>
                    {["APPROVED", "RETIRED"].includes(row.lifecycle_state) ? (
                      <button
                        type="button"
                        disabled={agentStudioActionId !== null}
                        onClick={() => void createNextAgentStudioVersion(row)}
                      >
                        Nova versão
                      </button>
                    ) : null}
                  </div>

                  {row.lifecycle_state === "DRAFT" || row.lifecycle_state === "REVIEW" || row.lifecycle_state === "APPROVED" ? (
                    <label>
                      Evidência / aprovação humana
                      <input
                        value={agentStudioEvidence[row.id] || ""}
                        onChange={(event) =>
                          setAgentStudioEvidence((current) => ({
                            ...current,
                            [row.id]: event.target.value,
                          }))
                        }
                        placeholder="evidence://..."
                        minLength={8}
                        maxLength={500}
                      />
                    </label>
                  ) : null}

                  {row.lifecycle_state === "DRAFT" ? (
                    <button
                      type="button"
                      disabled={
                        agentStudioActionId !== null ||
                        !isEvidenceRefValid(agentStudioEvidence[row.id] || "")
                      }
                      onClick={() => void submitAgentStudioReview(row)}
                    >
                      Enviar para REVIEW
                    </button>
                  ) : null}

                  {row.lifecycle_state === "REVIEW" ? (
                    <button
                      type="button"
                      disabled={
                        agentStudioActionId !== null ||
                        !isEvidenceRefValid(agentStudioEvidence[row.id] || "")
                      }
                      onClick={() => void approveAgentStudio(row)}
                    >
                      Aprovar versão
                    </button>
                  ) : null}

                  {row.lifecycle_state === "APPROVED" ? (
                    <button
                      type="button"
                      disabled={
                        agentStudioActionId !== null ||
                        !isEvidenceRefValid(agentStudioEvidence[row.id] || "")
                      }
                      onClick={() => void testAgentStudioActivationGate(row)}
                    >
                      Testar gate de publicação
                    </button>
                  ) : null}
                </article>
              ))}
            </div>

            {agentStudioPreview ? (
              <div className="admin-governance-note">
                <strong>Preview compilado — não executado</strong>
                <pre style={{ whiteSpace: "pre-wrap" }}>{agentStudioPreview}</pre>
              </div>
            ) : null}
            {agentStudioNotice ? <p aria-live="polite">{agentStudioNotice}</p> : null}
          </section>

          <section className="admin-section">
            <div className="admin-section__heading">
              <div>
                <span>ORQUESTRAÇÃO</span>
                <h2>Teams governados</h2>
              </div>
            </div>
            <div className="admin-agent-grid">
              {teams.map((team) => (
                <article className="admin-agent-card" key={team.team_id}>
                  <strong>{team.display_name}</strong>
                  <p>Team governado · {team.participant_policy.min_contributors}–{team.participant_policy.max_contributors} especialistas por turno.</p>
                  <small>{team.candidate_contributor_agent_ids.length} especialistas elegíveis</small>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-section" aria-labelledby="voice-studio-title">
            <div className="admin-section__heading">
              <div>
                <span>VOICE STUDIO · CATÁLOGO · PREVIEW · ASSIGNMENTS</span>
                <h2 id="voice-studio-title">Voz por agente com lifecycle governado</h2>
              </div>
              <small>Voice profile nunca redefine requested_agent ou turn_owner; também não altera autoria persistida.</small>
            </div>

            <div className="admin-agent-grid">
              <article className="admin-agent-card">
                <div className="admin-agent-card__top">
                  <strong>Adicionar voz ao catálogo</strong>
                  <span>REVIEW_REQUIRED</span>
                </div>
                <label>
                  Nome administrativo
                  <input
                    value={newVoiceName}
                    onChange={(event) => setNewVoiceName(event.target.value)}
                    placeholder="Ex.: Josué — Voz executiva"
                    maxLength={120}
                  />
                </label>
                <label>
                  Voice ID do provider
                  <input
                    value={newVoiceProviderId}
                    onChange={(event) => setNewVoiceProviderId(event.target.value)}
                    placeholder="voice_id oficial do provider"
                    maxLength={120}
                    autoComplete="off"
                  />
                </label>
                <label>
                  Modelo TTS
                  <input
                    value={newVoiceModel}
                    onChange={(event) => setNewVoiceModel(event.target.value)}
                    placeholder="gpt-4o-mini-tts"
                    maxLength={120}
                  />
                </label>
                <small>Provider atual suportado por este fluxo: OpenAI. A criação não aprova nem ativa a voz.</small>
                <button
                  type="button"
                  disabled={
                    voiceBusy ||
                    !newVoiceName.trim() ||
                    !newVoiceProviderId.trim() ||
                    !newVoiceModel.trim()
                  }
                  onClick={() => void createVoiceCatalogEntry()}
                >
                  {voiceBusy ? "Salvando…" : "Adicionar para revisão"}
                </button>
              </article>

              {voiceCatalog.map((voice) => (
                <article className="admin-agent-card" key={voice.id}>
                  <div className="admin-agent-card__top">
                    <strong>{voice.display_name}</strong>
                    <span>{voice.active ? voice.curation_status : "INATIVA"}</span>
                  </div>
                  <p>{voice.provider_key} · {voice.provider_model}</p>
                  <small>voice_id: {voice.provider_voice_id}</small>
                  <small>{voice.supported_locales.join(", ")} · {voice.delivery_modes.join(", ")}</small>
                  <div className="modal-card__actions">
                    <button
                      type="button"
                      disabled={voiceCatalogActionId !== null || !voice.active}
                      onClick={() => void previewVoiceCatalog(voice)}
                    >
                      {voicePreviewId === voice.id ? "Parar preview" : "Ouvir preview"}
                    </button>
                    <label>
                      Evidência de curadoria
                      <input
                        value={catalogEvidenceByVoice[voice.id] || ""}
                        onChange={(event) =>
                          setCatalogEvidenceByVoice((current) => ({
                            ...current,
                            [voice.id]: event.target.value,
                          }))
                        }
                        placeholder="evidence_ref"
                        minLength={8}
                        maxLength={500}
                        disabled={voiceCatalogActionId === voice.id || !voice.active}
                      />
                    </label>
                    {voice.curation_status !== "APPROVED" && voice.active ? (
                      <button
                        type="button"
                        disabled={
                          voiceCatalogActionId !== null ||
                          !isEvidenceRefValid(catalogEvidenceByVoice[voice.id] || "")
                        }
                        onClick={() => void curateVoiceCatalog(voice, "APPROVED")}
                      >
                        Aprovar voz
                      </button>
                    ) : null}
                    {voice.curation_status !== "REJECTED" && voice.active ? (
                      <button
                        type="button"
                        disabled={
                          voiceCatalogActionId !== null ||
                          !isEvidenceRefValid(catalogEvidenceByVoice[voice.id] || "")
                        }
                        onClick={() => void curateVoiceCatalog(voice, "REJECTED")}
                      >
                        Rejeitar
                      </button>
                    ) : null}
                  </div>
                  {voice.active ? (
                    <div className="modal-card__actions">
                      <label>
                        Evidência para desativação
                        <input
                          value={deactivationEvidenceByVoice[voice.id] || ""}
                          onChange={(event) =>
                            setDeactivationEvidenceByVoice((current) => ({
                              ...current,
                              [voice.id]: event.target.value,
                            }))
                          }
                          placeholder="approval://..."
                          minLength={8}
                          maxLength={500}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={
                          voiceCatalogActionId !== null ||
                          !isEvidenceRefValid(deactivationEvidenceByVoice[voice.id] || "")
                        }
                        onClick={() => void deactivateVoiceCatalog(voice)}
                      >
                        Desativar voz
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            {voiceCatalog.length === 0 ? (
              <div className="admin-governance-note">
                <strong>Nenhuma voz curada provisionada.</strong>
                <p>Cadastre uma voice ID oficial do provider, faça preview, aprove a curadoria e só depois crie o assignment do agente.</p>
              </div>
            ) : null}

            <div className="admin-section__heading">
              <div>
                <span>ASSIGNMENT GOVERNADO</span>
                <h3>Vincular voz aprovada ao agente sem alterar ownership</h3>
              </div>
            </div>
            <div className="admin-agent-grid">
              <article className="admin-agent-card">
                <label>Agente
                  <select value={draftAgentSlug} onChange={(event) => setDraftAgentSlug(event.target.value)}>
                    {agents.map((agent) => <option key={agent.slug} value={agent.slug}>{agent.display_name}</option>)}
                  </select>
                </label>
                <label>Voz aprovada
                  <select value={draftVoiceId} onChange={(event) => setDraftVoiceId(event.target.value)}>
                    <option value="">Selecione uma voz</option>
                    {voiceCatalog
                      .filter((voice) => voice.active && voice.curation_status === "APPROVED")
                      .map((voice) => (
                        <option key={voice.id} value={voice.id}>{voice.display_name}</option>
                      ))}
                  </select>
                </label>
                <button type="button" disabled={voiceBusy || !draftAgentSlug || !draftVoiceId} onClick={() => void saveVoiceDraft()}>
                  {voiceBusy ? "Salvando…" : "Salvar assignment em DRAFT"}
                </button>
                {voiceNotice ? <p aria-live="polite">{voiceNotice}</p> : null}
              </article>

              {voiceAssignments.map((assignment) => (
                <article className="admin-agent-card" key={assignment.id}>
                  <div className="admin-agent-card__top">
                    <strong>{assignment.agent_slug}</strong>
                    <span>{assignment.assignment_state}</span>
                  </div>
                  <p>{assignment.voice_display_name} · {assignment.locale}</p>
                  <small>{assignment.provider_key} · {assignment.validation_status} · v{assignment.version}</small>
                  {assignment.assignment_state === "DRAFT" ? (
                    <div className="modal-card__actions">
                      <label>
                        Evidência revisada
                        <input
                          value={validationEvidenceByAssignment[assignment.id] || ""}
                          onChange={(event) =>
                            setValidationEvidenceByAssignment((current) => ({
                              ...current,
                              [assignment.id]: event.target.value,
                            }))
                          }
                          placeholder="evidence_ref"
                          minLength={8}
                          maxLength={500}
                          disabled={
                            voiceActionId === assignment.id ||
                            assignment.validation_status !== "UNVALIDATED"
                          }
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void validateVoiceAssignment(assignment)}
                        disabled={
                          voiceActionId !== null ||
                          assignment.validation_status !== "UNVALIDATED" ||
                          !isEvidenceRefValid(validationEvidenceByAssignment[assignment.id] || "")
                        }
                      >
                        {voiceActionId === assignment.id ? "Processando…" : "Validar evidência"}
                      </button>
                      <label>
                        Aprovação humana
                        <input
                          value={activationEvidenceByAssignment[assignment.id] || ""}
                          onChange={(event) =>
                            setActivationEvidenceByAssignment((current) => ({
                              ...current,
                              [assignment.id]: event.target.value,
                            }))
                          }
                          placeholder="approval evidence_ref"
                          minLength={8}
                          maxLength={500}
                          disabled={
                            voiceActionId === assignment.id ||
                            assignment.validation_status !== "VALIDATED"
                          }
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void activateVoiceAssignment(assignment)}
                        disabled={
                          voiceActionId !== null ||
                          assignment.validation_status !== "VALIDATED" ||
                          !isEvidenceRefValid(activationEvidenceByAssignment[assignment.id] || "")
                        }
                      >
                        {voiceActionId === assignment.id ? "Processando…" : "Ativar assignment"}
                      </button>
                    </div>
                  ) : null}
                  {assignment.active && assignment.assignment_state !== "DISABLED" ? (
                    <div className="modal-card__actions">
                      <label>
                        Evidência para desativar
                        <input
                          value={assignmentDeactivationEvidence[assignment.id] || ""}
                          onChange={(event) =>
                            setAssignmentDeactivationEvidence((current) => ({
                              ...current,
                              [assignment.id]: event.target.value,
                            }))
                          }
                          placeholder="approval://..."
                          minLength={8}
                          maxLength={500}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={
                          voiceActionId !== null ||
                          !isEvidenceRefValid(assignmentDeactivationEvidence[assignment.id] || "")
                        }
                        onClick={() => void deactivateVoiceAssignment(assignment)}
                      >
                        Desativar assignment
                      </button>
                    </div>
                  ) : null}
                  <small>ACTIVE + VALIDATED alimenta o resolver canônico de TTS e Realtime; nunca redefine a autoria do agente. Ativação administrativa ≠ provider runtime provado ≠ voice-to-voice em produção.</small>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-section" aria-labelledby="cost-center-title">
            <div className="admin-section__heading">
              <div>
                <span>USAGE · COST CENTER</span>
                <h2 id="cost-center-title">Uso e custos — janela de 30 dias</h2>
              </div>
              <small>Custos só são estimados quando uma tarifa administrativa explícita está configurada.</small>
            </div>

            <div className="admin-grid">
              <article><span>TTS requests</span><strong>{usageCosts?.tts.requests ?? "—"}</strong></article>
              <article><span>Sínteses no provider</span><strong>{usageCosts?.tts.provider_syntheses ?? "—"}</strong></article>
              <article><span>Cache hits</span><strong>{usageCosts?.tts.cache_hits ?? "—"}</strong></article>
              <article><span>Caracteres TTS/provider</span><strong>{usageCosts?.tts.chars_provider_synthesized ?? "—"}</strong></article>
              <article>
                <span>Custo TTS estimado</span>
                <strong>
                  {usageCosts?.tts.cost_rate_configured
                    ? `$${(usageCosts.tts.estimated_provider_cost_usd ?? 0).toFixed(6)}`
                    : "Tarifa não configurada"}
                </strong>
              </article>
              <article><span>Saldo wallets</span><strong>{usageCosts ? `$${usageCosts.billing.wallet_balance_usd.toFixed(2)}` : "—"}</strong></article>
              <article><span>Receita confirmada</span><strong>{usageCosts ? `$${usageCosts.billing.confirmed_revenue_usd.toFixed(2)}` : "—"}</strong></article>
              <article><span>LLM token ledger</span><strong>{usageCosts?.llm_usage.status || "—"}</strong></article>
            </div>

            <div className="admin-agent-grid">
              {Object.entries(usageCosts?.tts.by_agent || {}).map(([agentId, usage]) => (
                <article className="admin-agent-card" key={agentId}>
                  <strong>{agentId}</strong>
                  <p>{usage.requests} reprodução(ões) · {usage.provider_syntheses} síntese(s) no provider</p>
                  <small>{usage.chars} caracteres solicitados</small>
                </article>
              ))}
            </div>

            {usageCosts?.llm_usage.status === "NOT_METERED" ? (
              <div className="admin-governance-note">
                <strong>LLM ainda não possui ledger de tokens consolidado.</strong>
                <p>Este painel não inventa custos de modelo. Input/output/cached tokens permanecem um gate separado da próxima wave.</p>
              </div>
            ) : null}
          </section>

          <section className="admin-section">
            <div className="admin-section__heading">
              <div>
                <span>SEGURANÇA</span>
                <h2>Postura operacional</h2>
              </div>
            </div>
            <div className="admin-grid">
              <article><span>Auth mode</span><strong className="admin-value">{security?.auth_mode || "—"}</strong></article>
              <article><span>GitHub readonly</span><strong className="admin-value">{String(security?.github_read_only ?? "—")}</strong></article>
              <article><span>Evolution execution</span><strong className="admin-value">{String(security?.evolution_execution_allowed ?? "—")}</strong></article>
              <article><span>Demo headers</span><strong className="admin-value">{String(security?.demo_headers_enabled ?? "—")}</strong></article>
              <article><span>Access gate</span><strong className="admin-value">{String(security?.access_gate_enabled ?? "—")}</strong></article>
              <article><span>Códigos configurados</span><strong className="admin-value">{security?.access_gate_code_hash_count ?? "—"}</strong></article>
              <article><span>Tenant do gate</span><strong className="admin-value">{String(security?.access_gate_tenant_configured ?? "—")}</strong></article>
              <article><span>Signing secret</span><strong className="admin-value">{String(security?.access_gate_signing_secret_configured ?? "—")}</strong></article>
            </div>
          </section>

          <section className="admin-section admin-governance-note">
            <span>GOVERNANÇA</span>
            <h2>Evolução da Plataforma permanece separada do Hyper Co-Criador.</h2>
            <p>
              O Co-Criador do usuário não recebe capacidades de GitHub, merge,
              deploy, migration ou autoevolução.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
