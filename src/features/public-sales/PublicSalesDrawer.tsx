import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { publicEnv } from "../../config/runtime";
import "./PublicSalesDrawer.css";

type Intent =
  | "understand_platform" | "shadow_ai_diagnostic" | "governed_ai"
  | "autonomous_sales" | "implementation" | "talk_to_specialist";
type Option = { id: string; label: string };
type GuidedSummary = { highlights: string[]; next_steps: string[]; notice: string };
type GuidedMessage = {
  message: string;
  intent: Intent;
  stage: "explain" | "diagnose" | "next_step";
  suggested_actions: string[];
  action_options: Option[];
  lead_capture: { eligible: boolean; reason: string };
  experience: { mode: "editorial"; step: number; total_steps: number; free_question_available: false };
  summary?: GuidedSummary | null;
};
type NewSession = {
  session_id: string;
  expires_at: string;
  privacy_notice_version: string;
  editorial_version: string;
  opening: GuidedMessage;
};

const INTENTS: ReadonlyArray<{ id: Intent; label: string; caption: string }> = [
  { id: "understand_platform", label: "Conhecer a EFATÁ 777", caption: "Onde a plataforma pode ajudar" },
  { id: "shadow_ai_diagnostic", label: "Uso de IA sem controle", caption: "Primeiros cuidados com Shadow AI" },
  { id: "governed_ai", label: "Governança de IA", caption: "Acesso, dados e rastreabilidade" },
  { id: "autonomous_sales", label: "Vendas com IA", caption: "Etapas de maior impacto" },
  { id: "implementation", label: "Implantar IA", caption: "Um caminho realista de adoção" },
  { id: "talk_to_specialist", label: "Preparar uma conversa", caption: "Organizar temas antes do contato" },
];

const BASE = publicEnv("VITE_API_BASE_URL").replace(/\/$/, "");
const PREFIX = "/api/v2/public/sales-sessions";

function friendlyError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("429")) return "Muitas tentativas. Aguarde um pouco para continuar.";
    if (error.message.includes("410")) return "Sua sessão expirou. Comece um novo diagnóstico.";
    if (error.message.includes("503")) return "O diagnóstico está indisponível no momento. Tente mais tarde.";
    if (error.message.includes("409")) return "Esta escolha não é válida para a etapa atual. Recomece se necessário.";
  }
  return "Não foi possível continuar. Verifique a conexão e tente novamente.";
}

async function postPublic<T>(path: string, payload: object, signal: AbortSignal): Promise<T> {
  if (!BASE) throw new Error("503:API_NOT_CONFIGURED");
  const response = await fetch(`${BASE}${PREFIX}${path}`, {
    method: "POST",
    mode: "cors",
    credentials: "omit",
    redirect: "error",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) throw new Error(`${response.status}:PUBLIC_SALES_REQUEST_FAILED`);
  return response.json() as Promise<T>;
}

export function PublicSalesDrawer() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Intent | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [current, setCurrent] = useState<GuidedMessage | null>(null);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [lastFailedAction, setLastFailedAction] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const pending = useRef<AbortController | null>(null);
  const requestId = useRef(0);

  const close = useCallback(() => {
    requestId.current += 1;
    pending.current?.abort();
    pending.current = null;
    setBusy(false);
    setOpen(false);
    setError("");
    previousFocus.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ) ?? []).filter((node) => node.getClientRects().length > 0);
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  useEffect(() => () => { pending.current?.abort(); }, []);

  function beginOpen() {
    previousFocus.current = document.activeElement as HTMLElement | null;
    setSelected(null);
    setSessionId("");
    setCurrent(null);
    setLastFailedAction(null);
    setError("");
    setCopyStatus("");
    setOpen(true);
  }

  useEffect(() => {
    if (import.meta.env.VITE_PUBLIC_SALES_ENABLED !== "true" || !BASE) return;
    const onRequested = () => beginOpen();
    window.addEventListener("efata777:open-public-sales", onRequested);
    return () => window.removeEventListener("efata777:open-public-sales", onRequested);
  }, []);

  async function start(intent: Intent) {
    if (busy) return;
    const controller = new AbortController();
    pending.current?.abort();
    pending.current = controller;
    const id = ++requestId.current;
    setBusy(true); setSelected(intent); setError(""); setLastFailedAction(null);
    try {
      const data = await postPublic<NewSession>("", {
        entry_intent: intent, language: "pt-BR", page_context: "landing", audio_enabled: false,
      }, controller.signal);
      if (requestId.current !== id) return;
      setSessionId(data.session_id);
      setCurrent(data.opening);
    } catch (reason) {
      if (controller.signal.aborted || requestId.current !== id) return;
      setError(friendlyError(reason));
    } finally {
      if (requestId.current === id) setBusy(false);
    }
  }

  async function choose(actionId: string) {
    if (busy || !sessionId || !current || current.summary) return;
    const controller = new AbortController();
    pending.current?.abort();
    pending.current = controller;
    const id = ++requestId.current;
    setBusy(true); setError(""); setLastFailedAction(null);
    try {
      const data = await postPublic<GuidedMessage>(`/${encodeURIComponent(sessionId)}/messages`, {
        action_id: actionId, language: "pt-BR", page_context: "landing", audio_enabled: false,
      }, controller.signal);
      if (requestId.current !== id) return;
      setCurrent(data);
    } catch (reason) {
      if (controller.signal.aborted || requestId.current !== id) return;
      setError(friendlyError(reason));
      setLastFailedAction(actionId);
    } finally {
      if (requestId.current === id) setBusy(false);
    }
  }

  function restart() {
    pending.current?.abort();
    requestId.current += 1;
    setBusy(false); setSelected(null); setSessionId("");
    setCurrent(null); setLastFailedAction(null); setError(""); setCopyStatus("");
  }

  async function copySummary() {
    const summary = current?.summary;
    if (!summary) return;
    try {
      await navigator.clipboard.writeText([
        "Orientação inicial EFATÁ 777",
        ...summary.highlights,
        "Próximos passos:",
        ...summary.next_steps,
        summary.notice,
      ].join("\n"));
      setCopyStatus("Resumo copiado.");
    } catch {
      setCopyStatus("Não foi possível copiar. Selecione o texto do resumo.");
    }
  }

  const isEnabled = import.meta.env.VITE_PUBLIC_SALES_ENABLED === "true";
  if (!isEnabled || !BASE || typeof document === "undefined") return null;

  return (
    <>
      {!open && (
        <button className="b11-public-entry" type="button" onClick={beginOpen}>
          <span aria-hidden="true">✧</span> Conversar com a EFATÁ 777
        </button>
      )}
      {open && createPortal(
        <div className="b11-public-layer">
          <button className="b11-public-backdrop" type="button" tabIndex={-1}
            aria-label="Fechar diagnóstico" onClick={close} />
          <section ref={dialogRef} className="b11-public-drawer" role="dialog" aria-modal="true"
            aria-labelledby="b11-public-title" aria-describedby="b11-public-description">
            <header className="b11-public-header">
              <div>
                <span className="b11-public-eyebrow">EFATÁ 777 · ASSISTENTE EDITORIAL</span>
                <h2 id="b11-public-title">Descubra a EFATÁ 777 em uma conversa guiada.</h2>
              </div>
              <button ref={closeRef} className="b11-public-close" type="button"
                onClick={close} aria-label="Fechar orientação">×</button>
            </header>
            <p id="b11-public-description" className="b11-public-intro">
              Em poucas escolhas, organizamos uma orientação inicial. Sem cadastro, sem coleta de
              documentos e sem diagnóstico jurídico ou técnico definitivo.
            </p>
            <div className="b11-public-body" aria-busy={busy}>
              {!current && (
                <>
                  <h3>Sobre o que deseja conversar?</h3>
                  <div className="b11-public-intents">
                    {INTENTS.map((intent) => (
                      <button key={intent.id} type="button" disabled={busy}
                        aria-pressed={selected === intent.id}
                        onClick={() => void start(intent.id)}>
                        <strong>{intent.label}</strong><span>{intent.caption}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {current && (
                <>
                  <div className="b11-public-progress" aria-label={`Etapa ${current.experience.step} de ${current.experience.total_steps}`}>
                    <span>Etapa {current.experience.step} de {current.experience.total_steps}</span>
                    <div className="b11-public-progressbar"><i style={{
                      width: `${100 * current.experience.step / current.experience.total_steps}%`,
                    }} /></div>
                  </div>
                  <p className="b11-public-question" aria-live="polite" aria-atomic="true">{current.message}</p>
                  {!current.summary ? (
                    <div className="b11-public-options">
                      {current.action_options.map((option) => (
                        <button key={option.id} type="button" disabled={busy}
                          onClick={() => void choose(option.id)}>{option.label}</button>
                      ))}
                    </div>
                  ) : (
                    <div className="b11-public-summary" aria-label="Sua orientação inicial">
                      <h3>O que observamos pelas suas escolhas</h3>
                      <ul>{current.summary.highlights.map((item) => <li key={item}>{item}</li>)}</ul>
                      <h3>Próximos passos</h3>
                      <ol>{current.summary.next_steps.map((item) => <li key={item}>{item}</li>)}</ol>
                      <p>{current.summary.notice}</p>
                      <button type="button" onClick={() => void copySummary()}>Copiar orientação</button>
                      {copyStatus && <p role="status">{copyStatus}</p>}
                    </div>
                  )}
                </>
              )}
              {busy && <p role="status" className="b11-public-loading">Preparando sua orientação…</p>}
              {error && <div className="b11-public-error" role="alert">
                <p>{error}</p>
                {lastFailedAction && <button type="button" onClick={() => void choose(lastFailedAction)}>
                  Tentar esta escolha novamente</button>}
                {!current && selected && <button type="button" onClick={() => void start(selected)}>Tentar novamente</button>}
              </div>}
              {current && <button className="b11-public-restart" type="button" disabled={busy}
                onClick={restart}>Iniciar outra orientação</button>}
            </div>
            <footer className="b11-public-footer">
              Conteúdo editorial automatizado · 0 chamadas a modelos de IA · Não substitui avaliação especializada.
            </footer>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
