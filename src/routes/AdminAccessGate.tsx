import React, { FormEvent, useEffect, useState } from "react";
import { ApiError, adminOtpStart, adminOtpVerify, getMe } from "../api";
import AdminPanel from "./AdminPanel";
import "../access.css";

type Phase = "credentials" | "otp";

function messageFor(error: unknown): string {
  const code = error instanceof ApiError ? error.code : "NETWORK_ERROR";
  if (code === "INVALID_CREDENTIALS") return "Não foi possível autenticar com esses dados.";
  if (code === "ADMIN_ROLE_REQUIRED") return "Esta conta não possui acesso administrativo.";
  if (code === "ADMIN_OTP_INVALID" || code === "AUTH_CHALLENGE_INVALID") return "Código inválido, expirado ou já utilizado.";
  if (code === "ADMIN_OTP_DELIVERY_UNAVAILABLE") return "Não foi possível enviar o código administrativo agora.";
  if (code === "NATIVE_AUTH_DISABLED") return "A autenticação nativa não está ativa nesta implantação.";
  return "Não foi possível concluir o acesso administrativo.";
}

export default function AdminAccessGate() {
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getMe()
      .then((profile) => {
        if (active && profile.admin_access) setReady(true);
        else if (active) setError("Acesso administrativo não autorizado.");
      })
      .catch((err) => {
        if (active && !(err instanceof ApiError && err.status === 401)) {
          setError("Não foi possível verificar a sessão administrativa.");
        }
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => { active = false; };
  }, []);

  async function start(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await adminOtpStart({ email: email.trim(), password });
      setChallengeToken(result.challenge_token);
      setPassword("");
      setPhase("otp");
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!challengeToken || !/^\d{6}$/.test(code) || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await adminOtpVerify({ challenge_token: challengeToken, code });
      if (!result.authenticated || !result.roles.some((role) => ["admin", "owner", "orkio_admin", "platform_owner"].includes(role))) {
        throw new Error("ADMIN_SESSION_NOT_CREATED");
      }
      setCode("");
      setChallengeToken("");
      setReady(true);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  if (ready) return <AdminPanel />;
  if (busy) return <main className="admin-shell"><p>Verificando acesso administrativo…</p></main>;

  return (
    <main className="admin-shell" id="main-content">
      <section className="admin-section" aria-labelledby="admin-auth-title">
        <span>PLATAFORMA · ACESSO ADMINISTRATIVO</span>
        <h1 id="admin-auth-title">Primeira linha de acesso</h1>
        <p>{phase === "credentials" ? "Informe sua credencial administrativa para receber um código único por e-mail." : "Digite o código de seis dígitos enviado ao e-mail administrativo."}</p>
        {error ? <p role="alert">{error}</p> : null}
        {phase === "credentials" ? (
          <form onSubmit={start}>
            <label>E-mail<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Senha<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            <button type="submit" disabled={busy}>Enviar código administrativo</button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <label>Código OTP<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required /></label>
            <button type="submit" disabled={busy || code.length !== 6}>Entrar no painel Admin</button>
            <button type="button" disabled={busy} onClick={() => { setPhase("credentials"); setChallengeToken(""); setCode(""); }}>Voltar</button>
          </form>
        )}
      </section>
    </main>
  );
}
