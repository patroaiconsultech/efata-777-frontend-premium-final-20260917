import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AdminGovernanceStatus,
  AdminOverview,
  AdminUser,
  AgentDefinition,
  getAdminAgents,
  getAdminGovernance,
  getAdminOverview,
  getAdminTeams,
  getAdminUsers,
  getMe,
  HyperCocreatorMe,
  TeamDefinition,
} from "../api";
import "../admin.css";

export default function AdminPanel() {
  const [me, setMe] = useState<HyperCocreatorMe | null>(null);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [teams, setTeams] = useState<TeamDefinition[]>([]);
  const [governance, setGovernance] = useState<AdminGovernanceStatus | null>(null);
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
        const [overview, userRows, catalog, teamCatalog, governanceStatus] = await Promise.all([
          getAdminOverview(),
          getAdminUsers(),
          getAdminAgents(),
          getAdminTeams(),
          getAdminGovernance(),
        ]);
        if (!active) return;
        setData(overview);
        setUsers(userRows);
        setAgents(catalog);
        setTeams(teamCatalog);
        setGovernance(governanceStatus);
      } catch {
        if (active) setError("Não foi possível carregar a visão administrativa.");
      }
    };
    void load();
    return () => { active = false; };
  }, []);

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

          <section className="admin-section">
            <div className="admin-section__heading">
              <div>
                <span>IDENTIDADE E ACESSO</span>
                <h2>Usuários e papéis do tenant</h2>
              </div>
              <small>Esta visão é limitada ao tenant da sessão autenticada.</small>
            </div>
            <div className="admin-agent-grid">
              {users.map((user) => (
                <article className="admin-agent-card" key={user.user_id}>
                  <div className="admin-agent-card__top">
                    <strong>{user.display_name || user.email}</strong>
                    <span>{user.active ? "ativo" : "inativo"}</span>
                  </div>
                  <p>{user.email}</p>
                  <small>{user.role} · e-mail {user.email_verified ? "verificado" : "pendente"}</small>
                </article>
              ))}
            </div>
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
                <span>SEGURANÇA</span>
                <h2>Governança operacional</h2>
              </div>
            </div>
            <div className="admin-grid">
              <article><span>Ambiente</span><strong className="admin-value">{governance?.environment || "—"}</strong></article>
              <article><span>Release</span><strong className="admin-value">{governance?.release_sha || "—"}</strong></article>
              <article><span>Access gate</span><strong className="admin-value">{String(governance?.access_gate_enabled ?? "—")}</strong></article>
              <article><span>Artefatos</span><strong className="admin-value">{String(governance?.artifacts_enabled ?? "—")}</strong></article>
              <article><span>Realtime</span><strong className="admin-value">{String(governance?.realtime_streaming_enabled ?? "—")}</strong></article>
              <article><span>Voz</span><strong className="admin-value">{String(governance?.voice_enabled ?? "—")}</strong></article>
              <article><span>Provedor LLM</span><strong className="admin-value">{governance?.llm_primary_provider || "—"}</strong></article>
              <article><span>Tenant</span><strong className="admin-value">{governance?.tenant_id || "—"}</strong></article>
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
