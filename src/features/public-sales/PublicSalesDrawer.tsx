import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
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
type Registration = {
  name: string; whatsapp: string; email: string; company: string; consent: boolean;
};
type AiTurn = { question: string; answer: string };
type RegistrationResult = { registered: boolean; remaining_questions: number; contact_storage: string; notice: string };
type AiResult = { answer: string; remaining_questions: number; handoff_recommended: boolean };
const PATROAI_WHATSAPP = "5551989697605";

function whatsappLink(registration: Registration, turns: AiTurn[], summary: GuidedSummary | null | undefined): string {
  const lines = [
    "Olá, equipe PatroAI! Conheci a EFATA 777 e gostaria de conversar.",
    `Nome: ${registration.name}`,
    `WhatsApp: ${registration.whatsapp}`,
    `E-mail: ${registration.email}`,
    registration.company.trim() ? `Empresa: ${registration.company}` : "",
    summary?.highlights[0] ? `Interesse inicial: ${summary.highlights[0]}` : "",
    turns.length ? `Assunto da conversa: ${turns[turns.length - 1].question}` : "",
  ].filter(Boolean);
  return `https://wa.me/${PATROAI_WHATSAPP}?text=${encodeURIComponent(lines.join("\n"))}`;
}

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
  const [registration, setRegistration] = useState<Registration>({
    name: "", whatsapp: "", email: "", company: "", consent: false,
  });
  const [registered, setRegistered] = useState(false);
  const [turns, setTurns] = useState<AiTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [remaining, setRemaining] = useState(3);

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
    setRegistration({ name: "", whatsapp: "", email: "", company: "", consent: false });
    setRegistered(false); setTurns([]); setRemaining(3); setQuestion("");
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
    setRegistration({ name: "", whatsapp: "", email: "", company: "", consent: false });
    setRegistered(false); setTurns([]); setRemaining(3); setQuestion("");
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
    setRegistration({ name: "", whatsapp: "", email: "", company: "", consent: false });
    setRegistered(false); setTurns([]); setRemaining(3); setQuestion("");
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

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !sessionId || !current?.summary || !registration.consent) return;
    const controller = new AbortController();
    pending.current?.abort(); pending.current = controller;
    const id = ++requestId.current;
    setBusy(true); setError("");
    try {
      const response = await postPublic<RegistrationResult>(`/${encodeURIComponent(sessionId)}/register`, {
        name: registration.name,
        whatsapp: registration.whatsapp,
        email: registration.email,
        company: registration.company || null,
        consent_to_contact: registration.consent,
      }, controller.signal);
      if (requestId.current !== id || !response.registered) return;
      setRegistered(true); setRemaining(response.remaining_questions);
    } catch (reason) {
      if (!controller.signal.aborted && requestId.current === id) setError(friendlyError(reason));
    } finally {
      if (requestId.current === id) setBusy(false);
    }
  }

  async function sendQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (busy || !sessionId || !registered || remaining < 1 || text.length < 3) return;
    const controller = new AbortController();
    pending.current?.abort(); pending.current = controller;
    const id = ++requestId.current;
    setBusy(true); setError("");
    try {
      const response = await postPublic<AiResult>(`/${encodeURIComponent(sessionId)}/ask`, {
        question: text,
      }, controller.signal);
      if (requestId.current !== id) return;
      setTurns((old) => [...old, { question: text, answer: response.answer }]);
      setRemaining(response.remaining_questions);
      setQuestion("");
    } catch (reason) {
      if (!controller.signal.aborted && requestId.current === id) {
        setError(friendlyError(reason));
        // Backend reserves quota before provider calls; never promise free retries.
      }
    } finally {
      if (requestId.current === id) setBusy(false);
    }
  }

  const b12Available = import.meta.env.VITE_PUBLIC_SALES_B12_ENABLED === "true";
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
              {b12Available
                ? "Em poucas escolhas, oferecemos uma orientação gratuita, sem cadastro. Ao final, você pode optar por uma conversa breve com IA e contato com a PatroAI."
                : "Em poucas escolhas, organizamos uma orientação inicial. Sem cadastro, sem coleta de documentos e sem diagnóstico jurídico ou técnico definitivo."}
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
                      {b12Available && (
                        <div className="b12-stage">
                          <h3>Quer conversar um pouco mais com a EFATA 777?</h3>
                          <p>O atendimento com IA é opcional: até 3 perguntas curtas e, se desejar,
                            encaminhamento ao WhatsApp da equipe PatroAI.</p>
                          {!registered ? (
                            <form className="b12-form" onSubmit={(event) => void submitRegistration(event)}>
                              <label>Nome completo
                                <input required minLength={3} maxLength={100} autoComplete="name"
                                  value={registration.name}
                                  onChange={(event) => setRegistration((r) => ({ ...r, name: event.target.value }))} />
                              </label>
                              <label>WhatsApp com DDD
                                <input required minLength={10} maxLength={25} autoComplete="tel" type="tel"
                                  value={registration.whatsapp}
                                  onChange={(event) => setRegistration((r) => ({ ...r, whatsapp: event.target.value }))} />
                              </label>
                              <label>E-mail
                                <input required maxLength={254} type="email" autoComplete="email"
                                  value={registration.email}
                                  onChange={(event) => setRegistration((r) => ({ ...r, email: event.target.value }))} />
                              </label>
                              <label>Empresa (opcional)
                                <input maxLength={100} autoComplete="organization"
                                  value={registration.company}
                                  onChange={(event) => setRegistration((r) => ({ ...r, company: event.target.value }))} />
                              </label>
                              <label className="b12-consent">
                                <input type="checkbox" required checked={registration.consent}
                                  onChange={(event) => setRegistration((r) => ({ ...r, consent: event.target.checked }))} />
                                Autorizo usar meus dados para preparar meu contato voluntário com a equipe PatroAI.
                              </label>
                              <p className="b12-privacy">
                                Não criamos conta privada nem salvamos seus dados de contato no servidor nesta etapa.
                                Os dados ficam nesta página e só chegam à equipe quando você enviar a mensagem no WhatsApp.
                              </p>
                              <button type="submit" disabled={busy || !registration.consent}>
                                Liberar 3 perguntas
                              </button>
                            </form>
                          ) : (
                            <>
                              <p role="status">Cadastro temporário confirmado. Restam {remaining} perguntas.</p>
                              <div className="b12-chat" aria-live="polite">
                                {turns.map((turn, index) => (
                                  <div className="b12-turn" key={index}>
                                    <p><strong>Você:</strong> {turn.question}</p>
                                    <p><strong>EFATA 777:</strong> {turn.answer}</p>
                                  </div>
                                ))}
                              </div>
                              {remaining > 0 && (
                                <form className="b12-form" onSubmit={(event) => void sendQuestion(event)}>
                                  <label>Sua pergunta
                                    <textarea rows={3} minLength={3} maxLength={350} required
                                      value={question} onChange={(event) => setQuestion(event.target.value)}
                                      placeholder="Como a EFATA 777 pode apoiar minha empresa?" />
                                  </label>
                                  <p className="b12-privacy">
                                    Sua pergunta e o histórico breve são enviados ao provedor de IA
                                    para gerar a resposta. Não inclua documentos, senhas ou dados sensíveis.
                                  </p>
                                  <button type="submit" disabled={busy || question.trim().length < 3}>
                                    Perguntar à EFATA 777
                                  </button>
                                </form>
                              )}
                              {remaining === 0 && <p>Concluímos esta conversa breve. Continue com a equipe PatroAI.</p>}
                              <a className="b12-whatsapp"
                                href={whatsappLink(registration, turns, current.summary)}
                                target="_blank" rel="noopener noreferrer">
                                Continuar pelo WhatsApp com a PatroAI
                              </a>
                              <p className="b12-privacy">O WhatsApp abrirá com a mensagem preparada.
                                Você ainda precisa tocar em Enviar para a equipe recebê-la.</p>
                            </>
                          )}
                        </div>
                      )}
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
              {b12Available
                ? "Jornada inicial sem LLM · Conversa opcional com até 3 respostas de IA · Não substitui avaliação especializada."
                : "Conteúdo editorial automatizado · 0 chamadas a modelos de IA · Não substitui avaliação especializada."}
            </footer>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
