import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ApiError,
  acceptPlatformInvitation,
  getPlatformInvitationStatus,
  isApiBaseConfigured,
  PlatformInvitationStatus,
} from "../api";

type Phase = "checking" | "ready" | "submitting" | "accepted" | "failed";

function tokenFromFragment(): string {
  if (typeof window === "undefined") return "";
  const fragment = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(fragment).get("token")?.trim() || "";
}

function describe(code: string): string {
  const messages: Record<string, string> = {
    PLATFORM_INVITATION_TOKEN_INVALID: "Este convite é inválido.",
    PLATFORM_INVITATION_EXPIRED: "Este convite expirou.",
    PLATFORM_INVITATION_REVOKED: "Este convite foi revogado.",
    PLATFORM_INVITATION_ALREADY_ACCEPTED: "Este convite já foi utilizado.",
    PLATFORM_INVITATION_DISABLED: "A ativação por convite está temporariamente indisponível.",
    PLATFORM_INVITATION_NOT_CONFIGURED: "A ativação por convite ainda não está configurada.",
    PASSWORD_CONFIRMATION_MISMATCH: "As senhas informadas não coincidem.",
    PASSWORD_TOO_SHORT: "A senha não atende ao tamanho mínimo de segurança.",
    EXISTING_ACCOUNT_PASSWORD_INVALID:
      "Já existe uma conta para este e-mail. Informe a senha atual ou use a recuperação de senha.",
    EXTERNAL_IDENTITY_LOGIN_REQUIRED:
      "Este e-mail já pertence a uma identidade externa. Entre pelo método de autenticação já associado.",
    IDENTITY_EMAIL_AMBIGUOUS:
      "A identidade deste e-mail precisa de revisão administrativa antes da ativação.",
  };
  return messages[code] || `Não foi possível concluir a ativação (${code}).`;
}

export default function PlatformInviteAccept() {
  const navigate = useNavigate();
  const configured = isApiBaseConfigured();
  const token = useMemo(tokenFromFragment, []);
  const [phase, setPhase] = useState<Phase>("checking");
  const [status, setStatus] = useState<PlatformInvitationStatus | null>(null);
  const [detail, setDetail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  useEffect(() => {
    if (!configured) {
      setDetail("A URL da API não está configurada nesta implantação.");
      setPhase("failed");
      return;
    }
    if (!token) {
      setDetail("Link de ativação incompleto.");
      setPhase("failed");
      return;
    }
    let active = true;
    getPlatformInvitationStatus(token)
      .then((result) => {
        if (!active) return;
        setStatus(result);
        if (result.status === "PENDING") {
          setPhase("ready");
          return;
        }
        const code =
          result.status === "EXPIRED"
            ? "PLATFORM_INVITATION_EXPIRED"
            : result.status === "REVOKED"
              ? "PLATFORM_INVITATION_REVOKED"
              : "PLATFORM_INVITATION_ALREADY_ACCEPTED";
        setDetail(describe(code));
        setPhase("failed");
      })
      .catch((error: unknown) => {
        if (!active) return;
        const code = error instanceof ApiError ? error.code : "ERRO";
        setDetail(describe(code));
        setPhase("failed");
      });
    return () => {
      active = false;
    };
  }, [configured, token]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (phase !== "ready" || !token) return;
    setDetail("");
    setPhase("submitting");
    try {
      await acceptPlatformInvitation({
        token,
        display_name: displayName.trim(),
        password,
        password_confirm: passwordConfirm,
      });
      // Remove the secret fragment immediately after successful one-time use.
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/activate");
      }
      setPassword("");
      setPasswordConfirm("");
      setPhase("accepted");
      navigate("/access?activated=1", { replace: true });
    } catch (error: unknown) {
      const code = error instanceof ApiError ? error.code : "ERRO";
      setDetail(describe(code));
      setPhase("failed");
    }
  };

  return (
    <main id="main-content" className="invite-shell">
      <h1>Crie sua conta na EFATÀ 777</h1>
      {phase === "checking" ? <p role="status">Validando o convite.</p> : null}

      {phase === "ready" && status ? (
        <form onSubmit={(event) => void submit(event)}>
          <p>
            Convite para <strong>{status.email_hint}</strong>. Defina seu nome e uma senha segura para ativar o acesso.
            O token é de uso único e expira em {new Date(status.expires_at).toLocaleString("pt-BR")}.
          </p>
          <label>
            Nome
            <input
              autoComplete="name"
              required
              minLength={2}
              maxLength={200}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={256}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>
            Confirmar senha
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={256}
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
            />
          </label>
          <button
            type="submit"
            className="primary-button"
            disabled={
              displayName.trim().length < 2 ||
              password.length < 12 ||
              password !== passwordConfirm
            }
          >
            Ativar acesso
          </button>
        </form>
      ) : null}

      {phase === "submitting" ? <p role="status">Ativando acesso com segurança.</p> : null}
      {phase === "accepted" ? <p role="status">Acesso ativado. Redirecionando para entrar.</p> : null}
      {phase === "failed" ? <p role="alert">{detail}</p> : null}

      <Link className="ghost-link" to="/access">
        Ir para o acesso
      </Link>
    </main>
  );
}
