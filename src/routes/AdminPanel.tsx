import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AdminOverview,
  AdminSecurityStatus,
  AgentDefinition,
  AdminVoiceAssignment,
  AdminVoiceCatalogEntry,
  getAdminOverview,
  getAdminSecurityStatus,
  getAdminVoiceAssignments,
  getAdminVoiceCatalog,
  saveAdminVoiceAssignmentDraft,
  validateAdminVoiceAssignment,
  activateAdminVoiceAssignment,
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
        const [
          overview,
          catalog,
          teamCatalog,
          securityStatus,
          voices,
          assignments,
          users,
          invitations,
        ] = await Promise.all([
          getAdminOverview(),
          listAgents(),
          listTeams(),
          getAdminSecurityStatus(),
          getAdminVoiceCatalog(),
          getAdminVoiceAssignments(),
          getAdminUsers(),
          getPlatformInvitations(),
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
        setDraftAgentSlug((current) => current || catalog[0]?.slug || "");
        setDraftVoiceId((current) => current || voices[0]?.id || "");
      } catch {
        if (active) setError("Não foi possível carregar a visão administrativa.");
      }
    };
    void load();
    return () => { active = false; };
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
                </article>
              ))}
            </div>
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

          <section className="admin-section">
            <div className="admin-section__heading">
              <div>
                <span>VOICE STUDIO · CATÁLOGO CURADO</span>
                <h2>Voz por agente com lifecycle governado</h2>
              </div>
              <small>Voice profile nunca redefine requested_agent ou turn_owner.</small>
            </div>

            {voiceCatalog.length === 0 ? (
              <div className="admin-governance-note">
                <strong>Nenhuma voz curada provisionada.</strong>
                <p>O frontend não importa catálogo externo nem inventa voice IDs.</p>
              </div>
            ) : (
              <div className="admin-agent-grid">
                {voiceCatalog.map((voice) => (
                  <article className="admin-agent-card" key={voice.id}>
                    <div className="admin-agent-card__top">
                      <strong>{voice.display_name}</strong>
                      <span>{voice.curation_status}</span>
                    </div>
                    <p>{voice.provider_key} · {voice.provider_model}</p>
                    <small>{voice.supported_locales.join(", ")} · {voice.delivery_modes.join(", ")}</small>
                  </article>
                ))}
              </div>
            )}

            <div className="admin-section__heading">
              <div>
                <span>ASSIGNMENT DRAFT</span>
                <h3>Salvar configuração sem promover runtime</h3>
              </div>
            </div>
            <div className="admin-agent-grid">
              <article className="admin-agent-card">
                <label>Agente
                  <select value={draftAgentSlug} onChange={(event) => setDraftAgentSlug(event.target.value)}>
                    {agents.map((agent) => <option key={agent.slug} value={agent.slug}>{agent.display_name}</option>)}
                  </select>
                </label>
                <label>Voz curada
                  <select value={draftVoiceId} onChange={(event) => setDraftVoiceId(event.target.value)}>
                    {voiceCatalog.map((voice) => <option key={voice.id} value={voice.id}>{voice.display_name}</option>)}
                  </select>
                </label>
                <button type="button" disabled={voiceBusy || !draftAgentSlug || !draftVoiceId} onClick={() => void saveVoiceDraft()}>
                  {voiceBusy ? "Salvando…" : "Salvar rascunho"}
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
                          assignment.assignment_state !== "DRAFT" ||
                          assignment.validation_status !== "UNVALIDATED"
                        }
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void validateVoiceAssignment(assignment)}
                      disabled={
                        voiceActionId !== null ||
                        assignment.assignment_state !== "DRAFT" ||
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
                          assignment.assignment_state !== "DRAFT" ||
                          assignment.validation_status !== "VALIDATED"
                        }
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void activateVoiceAssignment(assignment)}
                      disabled={
                        voiceActionId !== null ||
                        assignment.assignment_state !== "DRAFT" ||
                        assignment.validation_status !== "VALIDATED" ||
                        !isEvidenceRefValid(activationEvidenceByAssignment[assignment.id] || "")
                      }
                    >
                      {voiceActionId === assignment.id ? "Processando…" : "Ativar assignment"}
                    </button>
                  </div>
                  <small>Ativação administrativa ≠ provider runtime provado ≠ voice-to-voice em produção.</small>
                </article>
              ))}
            </div>
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
