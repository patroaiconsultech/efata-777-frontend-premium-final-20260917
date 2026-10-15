import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { publicEnv } from "../../config/runtime";
import { useLandingLanguage, type LandingLanguage } from "../../landing/useLandingLanguage";
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

const drawerCopy: Record<LandingLanguage, Record<string, string>> = {
  "pt": {
    "entry": "Conversar com a EFATÁ 777",
    "closeDiagnostic": "Fechar diagnóstico",
    "eyebrow": "EFATÁ 777 · ASSISTENTE EDITORIAL",
    "title": "Descubra a EFATÁ 777 em uma conversa guiada.",
    "close": "Fechar orientação",
    "introB12": "Em poucas escolhas, oferecemos uma orientação gratuita, sem cadastro. Ao final, você pode optar por uma conversa breve com IA e contato com a PatroAI.",
    "introB11": "Em poucas escolhas, organizamos uma orientação inicial. Sem cadastro, sem coleta de documentos e sem diagnóstico jurídico ou técnico definitivo.",
    "questionStart": "Sobre o que deseja conversar?",
    "step": "Etapa {step} de {total}",
    "summaryAria": "Sua orientação inicial",
    "summaryObserved": "O que observamos pelas suas escolhas",
    "nextSteps": "Próximos passos",
    "copy": "Copiar orientação",
    "copySuccess": "Resumo copiado.",
    "copyError": "Não foi possível copiar. Selecione o texto do resumo.",
    "b12Title": "Quer conversar um pouco mais com a EFATÁ 777?",
    "b12Intro": "O atendimento com IA é opcional: até 3 perguntas curtas e, se desejar, encaminhamento ao WhatsApp da equipe PatroAI.",
    "name": "Nome completo",
    "whatsapp": "WhatsApp com DDD",
    "email": "E-mail",
    "company": "Empresa (opcional)",
    "consent": "Autorizo usar meus dados para preparar meu contato voluntário com a equipe PatroAI.",
    "privacy": "Não criamos conta privada nem salvamos seus dados de contato no servidor nesta etapa. Os dados ficam nesta página e só chegam à equipe quando você enviar a mensagem no WhatsApp.",
    "unlock": "Liberar 3 perguntas",
    "registered": "Cadastro temporário confirmado. Restam {remaining} perguntas.",
    "you": "Você:",
    "question": "Sua pergunta",
    "questionPlaceholder": "Como a EFATÁ 777 pode apoiar minha empresa?",
    "provider": "Sua pergunta e o histórico breve são enviados ao provedor de IA para gerar a resposta. Não inclua documentos, senhas ou dados sensíveis.",
    "ask": "Perguntar à EFATÁ 777",
    "finished": "Concluímos esta conversa breve. Continue com a equipe PatroAI.",
    "toWhatsApp": "Continuar pelo WhatsApp com a PatroAI",
    "whatsappNotice": "O WhatsApp abrirá com a mensagem preparada. Você ainda precisa tocar em Enviar para a equipe recebê-la.",
    "loading": "Preparando sua orientação…",
    "retryChoice": "Tentar esta escolha novamente",
    "retry": "Tentar novamente",
    "restart": "Iniciar outra orientação",
    "footerB12": "Jornada inicial sem LLM · Conversa opcional com até 3 respostas de IA · Não substitui avaliação especializada.",
    "footerB11": "Conteúdo editorial automatizado · 0 chamadas a modelos de IA · Não substitui avaliação especializada.",
    "err429": "Muitas tentativas. Aguarde um pouco para continuar.",
    "err410": "Sua sessão expirou. Comece um novo diagnóstico.",
    "err503": "O diagnóstico está indisponível no momento. Tente mais tarde.",
    "err409": "Esta escolha não é válida para a etapa atual. Recomece se necessário.",
    "errDefault": "Não foi possível continuar. Verifique a conexão e tente novamente.",
    "clipboardTitle": "Orientação inicial EFATÁ 777",
    "clipboardNext": "Próximos passos:"
  },
  "es": {
    "entry": "Conversar con EFATÁ 777",
    "closeDiagnostic": "Cerrar diagnóstico",
    "eyebrow": "EFATÁ 777 · ASISTENTE EDITORIAL",
    "title": "Descubra EFATÁ 777 en una conversación guiada.",
    "close": "Cerrar orientación",
    "introB12": "Con unas pocas elecciones, ofrecemos orientación gratuita sin registro. Al final, puede optar por una breve conversación con IA y contactar a PatroAI.",
    "introB11": "Con unas pocas elecciones, organizamos una orientación inicial. Sin registro, sin recopilar documentos y sin un diagnóstico jurídico o técnico definitivo.",
    "questionStart": "¿Sobre qué le gustaría conversar?",
    "step": "Paso {step} de {total}",
    "summaryAria": "Su orientación inicial",
    "summaryObserved": "Lo que observamos a partir de sus elecciones",
    "nextSteps": "Próximos pasos",
    "copy": "Copiar orientación",
    "copySuccess": "Resumen copiado.",
    "copyError": "No se pudo copiar. Seleccione el texto del resumen.",
    "b12Title": "¿Quiere conversar un poco más con EFATÁ 777?",
    "b12Intro": "La atención con IA es opcional: hasta 3 preguntas cortas y, si lo desea, contacto por WhatsApp con el equipo PatroAI.",
    "name": "Nombre completo",
    "whatsapp": "WhatsApp con prefijo",
    "email": "Correo electrónico",
    "company": "Empresa (opcional)",
    "consent": "Autorizo el uso de mis datos para preparar mi contacto voluntario con el equipo PatroAI.",
    "privacy": "No creamos una cuenta privada ni guardamos sus datos de contacto en el servidor en esta etapa. Los datos permanecen en esta página y solo llegan al equipo cuando usted envía el mensaje por WhatsApp.",
    "unlock": "Habilitar 3 preguntas",
    "registered": "Registro temporal confirmado. Quedan {remaining} preguntas.",
    "you": "Usted:",
    "question": "Su pregunta",
    "questionPlaceholder": "¿Cómo puede EFATÁ 777 ayudar a mi empresa?",
    "provider": "Su pregunta y el historial breve se envían al proveedor de IA para generar la respuesta. No incluya documentos, contraseñas ni datos sensibles.",
    "ask": "Preguntar a EFATÁ 777",
    "finished": "Esta breve conversación ha terminado. Continúe con el equipo PatroAI.",
    "toWhatsApp": "Continuar por WhatsApp con PatroAI",
    "whatsappNotice": "WhatsApp se abrirá con un mensaje preparado. Aún debe pulsar Enviar para que el equipo lo reciba.",
    "loading": "Preparando su orientación…",
    "retryChoice": "Reintentar esta elección",
    "retry": "Intentar de nuevo",
    "restart": "Iniciar otra orientación",
    "footerB12": "Recorrido inicial sin LLM · Conversación opcional con hasta 3 respuestas de IA · No sustituye una evaluación especializada.",
    "footerB11": "Contenido editorial automatizado · 0 llamadas a modelos de IA · No sustituye una evaluación especializada.",
    "err429": "Demasiados intentos. Espere un momento para continuar.",
    "err410": "Su sesión ha caducado. Inicie un nuevo diagnóstico.",
    "err503": "El diagnóstico no está disponible en este momento. Inténtelo más tarde.",
    "err409": "Esta elección no es válida en el paso actual. Reinicie si es necesario.",
    "errDefault": "No se pudo continuar. Compruebe su conexión e inténtelo de nuevo.",
    "clipboardTitle": "Orientación inicial EFATÁ 777",
    "clipboardNext": "Próximos pasos:"
  },
  "en": {
    "entry": "Chat with EFATÁ 777",
    "closeDiagnostic": "Close assessment",
    "eyebrow": "EFATÁ 777 · GUIDED ASSISTANT",
    "title": "Discover EFATÁ 777 through a guided conversation.",
    "close": "Close guidance",
    "introB12": "Make a few choices to receive free guidance without registering. Afterwards, you can opt for a brief AI conversation and contact the PatroAI team.",
    "introB11": "Make a few choices to receive initial guidance. No registration, no documents collected, and no definitive legal or technical assessment.",
    "questionStart": "What would you like to discuss?",
    "step": "Step {step} of {total}",
    "summaryAria": "Your initial guidance",
    "summaryObserved": "What your choices suggest",
    "nextSteps": "Next steps",
    "copy": "Copy guidance",
    "copySuccess": "Summary copied.",
    "copyError": "Could not copy. Select the summary text.",
    "b12Title": "Would you like to continue talking with EFATÁ 777?",
    "b12Intro": "The AI conversation is optional: up to 3 short questions, followed by WhatsApp contact with the PatroAI team if you wish.",
    "name": "Full name",
    "whatsapp": "WhatsApp with area code",
    "email": "Email",
    "company": "Company (optional)",
    "consent": "I authorize the use of my information to prepare my voluntary contact with the PatroAI team.",
    "privacy": "No private account is created, and your contact details are not stored on the server at this stage. They stay on this page and reach the team only when you send the WhatsApp message.",
    "unlock": "Unlock 3 questions",
    "registered": "Temporary registration confirmed. {remaining} questions remaining.",
    "you": "You:",
    "question": "Your question",
    "questionPlaceholder": "How can EFATÁ 777 help my company?",
    "provider": "Your question and brief conversation history are sent to the AI provider to generate a reply. Do not include documents, passwords, or sensitive information.",
    "ask": "Ask EFATÁ 777",
    "finished": "This brief conversation has ended. Continue with the PatroAI team.",
    "toWhatsApp": "Continue on WhatsApp with PatroAI",
    "whatsappNotice": "WhatsApp will open with a prepared message. You still need to tap Send for the team to receive it.",
    "loading": "Preparing your guidance…",
    "retryChoice": "Retry this choice",
    "retry": "Try again",
    "restart": "Start another guidance session",
    "footerB12": "Initial guided journey without LLM · Optional conversation with up to 3 AI answers · Not a substitute for professional advice.",
    "footerB11": "Automated editorial content · 0 calls to AI models · Not a substitute for professional advice.",
    "err429": "Too many attempts. Please wait before continuing.",
    "err410": "Your session has expired. Start a new assessment.",
    "err503": "Guidance is currently unavailable. Try again later.",
    "err409": "This choice is not valid at the current step. Restart if needed.",
    "errDefault": "Unable to continue. Check your connection and try again.",
    "clipboardTitle": "EFATÁ 777 initial guidance",
    "clipboardNext": "Next steps:"
  }
};
const localizedIntents: Record<LandingLanguage, readonly (readonly [string, string])[]> = {
  "pt": [
    [
      "Conhecer a EFATÁ 777",
      "Onde a plataforma pode ajudar"
    ],
    [
      "Uso de IA sem controle",
      "Primeiros cuidados com Shadow AI"
    ],
    [
      "Governança de IA",
      "Acesso, dados e rastreabilidade"
    ],
    [
      "Vendas com IA",
      "Etapas de maior impacto"
    ],
    [
      "Implantar IA",
      "Um caminho realista de adoção"
    ],
    [
      "Preparar uma conversa",
      "Organizar temas antes do contato"
    ]
  ],
  "es": [
    [
      "Conocer EFATÁ 777",
      "Dónde puede ayudar la plataforma"
    ],
    [
      "Uso de IA sin control",
      "Primeros cuidados ante Shadow AI"
    ],
    [
      "Gobernanza de IA",
      "Acceso, datos y trazabilidad"
    ],
    [
      "Ventas con IA",
      "Etapas de mayor impacto"
    ],
    [
      "Implementar IA",
      "Una ruta realista de adopción"
    ],
    [
      "Preparar una conversación",
      "Organice los temas antes del contacto"
    ]
  ],
  "en": [
    [
      "Discover EFATÁ 777",
      "How the platform can help"
    ],
    [
      "Uncontrolled AI use",
      "First steps to address Shadow AI"
    ],
    [
      "AI governance",
      "Access, data, and traceability"
    ],
    [
      "AI-powered sales",
      "High-impact opportunities"
    ],
    [
      "Implement AI",
      "A realistic adoption path"
    ],
    [
      "Prepare a conversation",
      "Organize topics before reaching out"
    ]
  ]
};

const BASE = publicEnv("VITE_API_BASE_URL").replace(/\/$/, "");
const PREFIX = "/api/v2/public/sales-sessions";

function friendlyError(error: unknown, language: LandingLanguage): string {
  const t = (key: string) => drawerCopy[language][key];
  if (error instanceof Error) {
    if (error.message.includes("429")) return t("err429");
    if (error.message.includes("410")) return t("err410");
    if (error.message.includes("503")) return t("err503");
    if (error.message.includes("409")) return t("err409");
  }
  return t("errDefault");
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
  const language = useLandingLanguage();
  const t = (key: string) => drawerCopy[language][key];
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
    document.body.classList.add("b11-public-open");
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
      document.body.classList.remove("b11-public-open");
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
      setError(friendlyError(reason, language));
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
      setError(friendlyError(reason, language));
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
        t("clipboardTitle"),
        ...summary.highlights,
        t("clipboardNext"),
        ...summary.next_steps,
        summary.notice,
      ].join("\n"));
      setCopyStatus(t("copySuccess"));
    } catch {
      setCopyStatus(t("copyError"));
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
      if (!controller.signal.aborted && requestId.current === id) setError(friendlyError(reason, language));
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
        setError(friendlyError(reason, language));
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
          <span aria-hidden="true">✧</span> {t("entry")}
        </button>
      )}
      {open && createPortal(
        <div className="b11-public-layer">
          <button className="b11-public-backdrop" type="button" tabIndex={-1}
            aria-label={t("closeDiagnostic")} onClick={close} />
          <section ref={dialogRef} className="b11-public-drawer" role="dialog" aria-modal="true"
            aria-labelledby="b11-public-title" aria-describedby="b11-public-description">
            <header className="b11-public-header">
              <div>
                <span className="b11-public-eyebrow">{t("eyebrow")}</span>
                <h2 id="b11-public-title">{t("title")}</h2>
              </div>
              <button ref={closeRef} className="b11-public-close" type="button"
                onClick={close} aria-label={t("close")}>×</button>
            </header>
            <p id="b11-public-description" className="b11-public-intro">
              {b12Available
                ? t("introB12")
                : t("introB11")}
            </p>
            <div className="b11-public-body" aria-busy={busy}>
              {!current && (
                <>
                  <h3>{t("questionStart")}</h3>
                  <div className="b11-public-intents">
                    {INTENTS.map((intent, index) => (
                      <button key={intent.id} type="button" disabled={busy}
                        aria-pressed={selected === intent.id}
                        onClick={() => void start(intent.id)}>
                        <strong>{localizedIntents[language][index][0]}</strong><span>{localizedIntents[language][index][1]}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {current && (
                <>
                  <div className="b11-public-progress" aria-label={t("step").replace("{step}", String(current.experience.step)).replace("{total}", String(current.experience.total_steps))}>
                    <span>{t("step").replace("{step}", String(current.experience.step)).replace("{total}", String(current.experience.total_steps))}</span>
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
                    <div className="b11-public-summary" aria-label={t("summaryAria")}>
                      <h3>{t("summaryObserved")}</h3>
                      <ul>{current.summary.highlights.map((item) => <li key={item}>{item}</li>)}</ul>
                      <h3>{t("nextSteps")}</h3>
                      <ol>{current.summary.next_steps.map((item) => <li key={item}>{item}</li>)}</ol>
                      <p>{current.summary.notice}</p>
                      <button type="button" onClick={() => void copySummary()}>{t("copy")}</button>
                      {copyStatus && <p role="status">{copyStatus}</p>}
                      {b12Available && (
                        <div className="b12-stage">
                          <h3>{t("b12Title")}</h3>
                          <p>{t("b12Intro")}</p>
                          {!registered ? (
                            <form className="b12-form" onSubmit={(event) => void submitRegistration(event)}>
                              <label>{t("name")}
                                <input required minLength={3} maxLength={100} autoComplete="name"
                                  value={registration.name}
                                  onChange={(event) => setRegistration((r) => ({ ...r, name: event.target.value }))} />
                              </label>
                              <label>{t("whatsapp")}
                                <input required minLength={10} maxLength={25} autoComplete="tel" type="tel"
                                  value={registration.whatsapp}
                                  onChange={(event) => setRegistration((r) => ({ ...r, whatsapp: event.target.value }))} />
                              </label>
                              <label>{t("email")}
                                <input required maxLength={254} type="email" autoComplete="email"
                                  value={registration.email}
                                  onChange={(event) => setRegistration((r) => ({ ...r, email: event.target.value }))} />
                              </label>
                              <label>{t("company")}
                                <input maxLength={100} autoComplete="organization"
                                  value={registration.company}
                                  onChange={(event) => setRegistration((r) => ({ ...r, company: event.target.value }))} />
                              </label>
                              <label className="b12-consent">
                                <input type="checkbox" required checked={registration.consent}
                                  onChange={(event) => setRegistration((r) => ({ ...r, consent: event.target.checked }))} />
                                {t("consent")}
                              </label>
                              <p className="b12-privacy">
                                {t("privacy")}
                              </p>
                              <button type="submit" disabled={busy || !registration.consent}>
                                {t("unlock")}
                              </button>
                            </form>
                          ) : (
                            <>
                              <p role="status">{t("registered").replace("{remaining}", String(remaining))}</p>
                              <div className="b12-chat" aria-live="polite">
                                {turns.map((turn, index) => (
                                  <div className="b12-turn" key={index}>
                                    <p><strong>{t("you")}</strong> {turn.question}</p>
                                    <p><strong>EFATA 777:</strong> {turn.answer}</p>
                                  </div>
                                ))}
                              </div>
                              {remaining > 0 && (
                                <form className="b12-form" onSubmit={(event) => void sendQuestion(event)}>
                                  <label>{t("question")}
                                    <textarea rows={3} minLength={3} maxLength={350} required
                                      value={question} onChange={(event) => setQuestion(event.target.value)}
                                      placeholder={t("questionPlaceholder")} />
                                  </label>
                                  <p className="b12-privacy">
                                    {t("provider")}
                                  </p>
                                  <button type="submit" disabled={busy || question.trim().length < 3}>
                                    {t("ask")}
                                  </button>
                                </form>
                              )}
                              {remaining === 0 && <p>{t("finished")}</p>}
                              <a className="b12-whatsapp"
                                href={whatsappLink(registration, turns, current.summary)}
                                target="_blank" rel="noopener noreferrer">
                                {t("toWhatsApp")}
                              </a>
                              <p className="b12-privacy">{t("whatsappNotice")}</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              {busy && <p role="status" className="b11-public-loading">{t("loading")}</p>}
              {error && <div className="b11-public-error" role="alert">
                <p>{error}</p>
                {lastFailedAction && <button type="button" onClick={() => void choose(lastFailedAction)}>
                  {t("retryChoice")}</button>}
                {!current && selected && <button type="button" onClick={() => void start(selected)}>{t("retry")}</button>}
              </div>}
              {current && <button className="b11-public-restart" type="button" disabled={busy}
                onClick={restart}>{t("restart")}</button>}
            </div>
            <footer className="b11-public-footer">
              {b12Available
                ? t("footerB12")
                : t("footerB11")}
            </footer>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
