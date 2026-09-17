import React, { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ApiError,
  getNativeSession,
  getNativeSessions,
  nativeReauthenticate,
  revokeNativeSession,
  revokeOtherNativeSessions,
  type NativeSessionRecord,
} from "../api";
import "../access.css";

function securityError(error: unknown): string {
  const code = error instanceof ApiError ? error.code : "NETWORK_ERROR";
  const messages: Record<string, string> = {
    RECENT_REAUTHENTICATION_REQUIRED:
      "Confirme sua senha e segundo fator antes de revogar outras sessões.",
    REAUTHENTICATION_FAILED:
      "Não foi possível confirmar sua identidade.",
    NATIVE_SESSION_REQUIRED:
      "Sua sessão expirou. Entre novamente.",
  };
  return messages[code] || `Não foi possível concluir a operação (${code}).`;
}

export default function SecuritySettings() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<NativeSessionRecord[]>([]);
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [reauthenticated, setReauthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    const session = await getNativeSession();
    if (!session.authenticated) throw new ApiError(401, "NATIVE_SESSION_REQUIRED");
    const result = await getNativeSessions();
    setSessions(result.sessions);
  }

  useEffect(() => {
    refresh().catch((error) => {
      setMessage(securityError(error));
      if (error instanceof ApiError && error.status === 401) {
        navigate("/access", { replace: true });
      }
    });
  }, [navigate]);

  async function submitReauth(event: FormEvent) {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await nativeReauthenticate({
        password,
        code: useRecoveryCode ? null : (mfaCode.trim() || null),
        recovery_code: useRecoveryCode ? (mfaCode.trim() || null) : null,
      });
      setReauthenticated(true);
      setPassword("");
      setMfaCode("");
      setMessage("Identidade confirmada por uma janela curta de segurança.");
    } catch (error) {
      setReauthenticated(false);
      setMessage(securityError(error));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(session: NativeSessionRecord) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await revokeNativeSession(session.id);
      if (result.status === "CURRENT_SESSION_REVOKED") {
        navigate("/access", { replace: true });
        return;
      }
      await refresh();
      setMessage("Sessão revogada.");
    } catch (error) {
      setMessage(securityError(error));
    } finally {
      setBusy(false);
    }
  }

  async function revokeOthers() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await revokeOtherNativeSessions();
      await refresh();
      setMessage("Todas as outras sessões foram revogadas.");
    } catch (error) {
      setMessage(securityError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="access-portal" id="main-content">
      <div className="access-portal__glow" aria-hidden="true" />
      <section className="access-card" aria-labelledby="security-title">
        <Link className="access-card__back" to="/app">Voltar ao console</Link>
        <p className="access-eyebrow">PATROAI · SEGURANÇA DA CONTA</p>
        <h1 id="security-title">Sessões e reautenticação.</h1>
        <p className="access-lead">
          Revise dispositivos ativos. Para revogar outras sessões, o backend exige
          confirmação recente da senha e, em contas privilegiadas, do segundo fator.
        </p>

        <div className="access-step">
          <span>SESSÕES ATIVAS</span>
          <div className="security-session-list">
            {sessions.map((session) => (
              <article className="security-session" key={session.id}>
                <strong>{session.current ? "Sessão atual" : "Outra sessão"}</strong>
                <div className="security-session__meta">
                  <span>Último uso: {new Date(session.last_seen_at).toLocaleString()}</span>
                  <span>Expira: {new Date(session.expires_at).toLocaleString()}</span>
                  <span>MFA: {session.mfa_verified ? "confirmado" : "não aplicável"}</span>
                </div>
                <small>{session.user_agent || "Cliente não identificado"}</small>
                <button
                  className="access-text-button"
                  type="button"
                  disabled={busy || (!session.current && !reauthenticated)}
                  onClick={() => revoke(session)}
                >
                  {session.current ? "Encerrar esta sessão" : "Revogar sessão"}
                </button>
              </article>
            ))}
          </div>
        </div>

        <form className="access-step" onSubmit={submitReauth}>
          <span>CONFIRMAÇÃO RECENTE</span>
          <h2>Autorize ações sensíveis.</h2>
          <label>
            <span>Senha atual</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label>
            <span>{useRecoveryCode ? "Código de recuperação" : "Código MFA, se exigido"}</span>
            <input
              value={mfaCode}
              onChange={(event) => setMfaCode(event.target.value)}
              autoComplete="one-time-code"
            />
          </label>
          <button
            className="access-text-button"
            type="button"
            onClick={() => { setUseRecoveryCode((value) => !value); setMfaCode(""); }}
          >
            {useRecoveryCode ? "Usar autenticador" : "Usar código de recuperação"}
          </button>
          <button className="access-primary" disabled={busy || !password}>
            {busy ? "Confirmando..." : "Confirmar identidade"}
          </button>
        </form>

        <button
          className="access-primary"
          type="button"
          disabled={busy || !reauthenticated}
          onClick={revokeOthers}
        >
          Revogar todas as outras sessões
        </button>

        {message ? <p className="access-error" role="status">{message}</p> : null}
      </section>
    </main>
  );
}
