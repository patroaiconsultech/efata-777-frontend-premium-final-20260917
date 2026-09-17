import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { apiForm } from "../api";
import "./TalentApplication.css";

type ApplicationType = "career" | "consultant";

type CountryRule = {
  iso: string;
  label: string;
  dial: string;
  maxDigits: number;
  placeholder: string;
  format: (digits: string) => string;
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const formatBR = (digits: string) => {
  const d = onlyDigits(digits).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const formatUS = (digits: string) => {
  const d = onlyDigits(digits).slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

const formatGroups = (digits: string, maxDigits: number) => {
  const d = onlyDigits(digits).slice(0, maxDigits);
  return d.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
};

const COUNTRIES: CountryRule[] = [
  { iso: "BR", label: "Brasil", dial: "+55", maxDigits: 11, placeholder: "(51) 99999-9999", format: formatBR },
  { iso: "PT", label: "Portugal", dial: "+351", maxDigits: 9, placeholder: "912 345 678", format: (d) => formatGroups(d, 9) },
  { iso: "US", label: "Estados Unidos", dial: "+1", maxDigits: 10, placeholder: "(305) 555-1234", format: formatUS },
  { iso: "CA", label: "Canadá", dial: "+1", maxDigits: 10, placeholder: "(416) 555-1234", format: formatUS },
  { iso: "ES", label: "Espanha", dial: "+34", maxDigits: 9, placeholder: "612 345 678", format: (d) => formatGroups(d, 9) },
  { iso: "GB", label: "Reino Unido", dial: "+44", maxDigits: 10, placeholder: "770 090 0123", format: (d) => formatGroups(d, 10) },
  { iso: "IT", label: "Itália", dial: "+39", maxDigits: 10, placeholder: "312 345 6789", format: (d) => formatGroups(d, 10) },
  { iso: "DE", label: "Alemanha", dial: "+49", maxDigits: 11, placeholder: "151 234 56789", format: (d) => formatGroups(d, 11) },
  { iso: "FR", label: "França", dial: "+33", maxDigits: 9, placeholder: "612 345 678", format: (d) => formatGroups(d, 9) },
  { iso: "AR", label: "Argentina", dial: "+54", maxDigits: 10, placeholder: "911 234 5678", format: (d) => formatGroups(d, 10) },
  { iso: "UY", label: "Uruguai", dial: "+598", maxDigits: 8, placeholder: "991 234 56", format: (d) => formatGroups(d, 8) },
  { iso: "PY", label: "Paraguai", dial: "+595", maxDigits: 9, placeholder: "981 234 567", format: (d) => formatGroups(d, 9) },
  { iso: "CL", label: "Chile", dial: "+56", maxDigits: 9, placeholder: "912 345 678", format: (d) => formatGroups(d, 9) },
  { iso: "MX", label: "México", dial: "+52", maxDigits: 10, placeholder: "551 234 5678", format: (d) => formatGroups(d, 10) },
];

const DRAFT_KEY = "patroai:talent-application:v18.2";

const normalizeE164 = (country: CountryRule, national: string) => {
  const digits = onlyDigits(national);
  return `${country.dial}${digits}`;
};

export default function TalentApplication() {
  const [searchParams] = useSearchParams();
  const initialType: ApplicationType =
    searchParams.get("type") === "consultant" ? "consultant" : "career";
  const initialArea = searchParams.get("area") || "";

  const [type, setType] = useState<ApplicationType>(initialType);
  const [countryIso, setCountryIso] = useState("BR");
  const [phoneNational, setPhoneNational] = useState("");
  const [status, setStatus] = useState("");
  const [statusKind, setStatusKind] = useState<"" | "success" | "error">("");
  const [submitting, setSubmitting] = useState(false);
  const [resumeName, setResumeName] = useState("Nenhum arquivo selecionado.");

  const country = useMemo(
    () => COUNTRIES.find((item) => item.iso === countryIso) || COUNTRIES[0],
    [countryIso],
  );

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        type?: ApplicationType;
        countryIso?: string;
        phoneNational?: string;
        values?: Record<string, string | boolean>;
      };

      if (draft.type) setType(draft.type);
      if (draft.countryIso) setCountryIso(draft.countryIso);
      if (draft.phoneNational) setPhoneNational(draft.phoneNational);

      window.setTimeout(() => {
        const form = document.querySelector<HTMLFormElement>("[data-talent-form]");
        if (!form || !draft.values) return;
        Object.entries(draft.values).forEach(([name, value]) => {
          const field = form.elements.namedItem(name);
          if (field instanceof HTMLInputElement && field.type === "checkbox") {
            field.checked = Boolean(value);
          } else if (
            field instanceof HTMLInputElement ||
            field instanceof HTMLTextAreaElement ||
            field instanceof HTMLSelectElement
          ) {
            field.value = typeof value === "string" ? value : "";
          }
        });
      }, 0);
    } catch {
      // Draft recovery is best-effort.
    }
  }, []);

  const persistDraft = (form: HTMLFormElement) => {
    try {
      const values: Record<string, string | boolean> = {};
      Array.from(form.elements).forEach((field) => {
        if (
          !(
            field instanceof HTMLInputElement ||
            field instanceof HTMLTextAreaElement ||
            field instanceof HTMLSelectElement
          )
        ) return;
        if (!field.name || field.type === "file" || field.name === "website") return;
        values[field.name] =
          field instanceof HTMLInputElement && field.type === "checkbox"
            ? field.checked
            : field.value;
      });

      window.sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ type, countryIso, phoneNational, values }),
      );
    } catch {
      // Draft persistence must never block the form.
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    setStatus("");
    setStatusKind("");

    if (!form.reportValidity()) {
      setStatus("Revise os campos obrigatórios antes de enviar.");
      setStatusKind("error");
      return;
    }

    const resume = form.elements.namedItem("resume") as HTMLInputElement | null;
    const file = resume?.files?.[0];
    if (!file || !/\.(pdf|doc|docx)$/i.test(file.name) || file.size > 10 * 1024 * 1024) {
      setStatus("Envie um currículo em PDF, DOC ou DOCX com até 10 MB.");
      setStatusKind("error");
      return;
    }

    const digits = onlyDigits(phoneNational);
    if (digits.length < Math.min(8, country.maxDigits - 1) || digits.length > country.maxDigits) {
      setStatus("Confira o número de WhatsApp informado.");
      setStatusKind("error");
      return;
    }

    persistDraft(form);
    setSubmitting(true);
    setStatus("Enviando sua candidatura com segurança…");

    try {
      const payload = new FormData(form);
      payload.set("application_type", type);
      payload.set("phone", normalizeE164(country, phoneNational));
      payload.set("phone_country_iso", country.iso);
      payload.set("phone_country_code", country.dial);
      payload.set("phone_national", digits);

      await apiForm<{ ok: boolean; application_id: string }>(
        "/api/public/applications",
        payload,
      );

      window.sessionStorage.removeItem(DRAFT_KEY);
      form.reset();
      setPhoneNational("");
      setResumeName("Nenhum arquivo selecionado.");
      setStatus("Candidatura enviada. Obrigado por compartilhar sua trajetória com a PatroAI.");
      setStatusKind("success");
    } catch {
      persistDraft(form);
      setStatus(
        "Não foi possível enviar agora. Seu rascunho foi preservado nesta aba para você tentar novamente.",
      );
      setStatusKind("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="talent-page" id="main-content">
      <header className="talent-page__topbar">
        <Link className="talent-page__brand" to="/">
          <img src="/assets/patroai-logo-integrated.png" alt="PatroAI" />
          <span>PatroAI</span>
        </Link>
        <Link className="talent-page__back" to="/#carreiras">
          ← Voltar para Carreiras & Talentos
        </Link>
      </header>

      <section className="talent-page__hero">
        <p className="talent-page__eyebrow">CARREIRAS · TALENTOS · CONSULTORES</p>
        <h1>Vamos conhecer sua trajetória.</h1>
        <p>
          Esta página é dedicada à sua candidatura. Preencha com calma; o rascunho
          fica preservado nesta aba até o envio.
        </p>
      </section>

      <section className="talent-page__panel">
        <div className="talent-page__switch" role="group" aria-label="Tipo de candidatura">
          <button
            type="button"
            className={type === "career" ? "is-active" : ""}
            onClick={() => setType("career")}
            aria-pressed={type === "career"}
          >
            Carreiras & Talentos
          </button>
          <button
            type="button"
            className={type === "consultant" ? "is-active" : ""}
            onClick={() => setType("consultant")}
            aria-pressed={type === "consultant"}
          >
            Quero ser Consultor
          </button>
        </div>

        <form
          className="talent-form"
          data-talent-form
          onSubmit={submit}
          onInput={(event) => persistDraft(event.currentTarget)}
          onChange={(event) => persistDraft(event.currentTarget)}
          noValidate
        >
          <input type="hidden" name="application_type" value={type} readOnly />
          <input className="talent-honeypot" name="website" tabIndex={-1} autoComplete="off" />

          <div className="talent-form__grid">
            <label>
              <span>Nome completo *</span>
              <input name="full_name" autoComplete="name" required maxLength={120} />
            </label>

            <label>
              <span>E-mail *</span>
              <input name="email" type="email" autoComplete="email" required maxLength={160} />
            </label>

            <div className="talent-form__wide talent-phone">
              <span className="talent-form__label">WhatsApp *</span>
              <div className="talent-phone__row">
                <label>
                  <span>País</span>
                  <select
                    value={countryIso}
                    onChange={(event) => {
                      setCountryIso(event.target.value);
                      setPhoneNational("");
                    }}
                    aria-label="País do WhatsApp"
                  >
                    {COUNTRIES.map((item) => (
                      <option key={item.iso} value={item.iso}>
                        {item.label} · {item.dial}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="talent-phone__number">
                  <span>Número</span>
                  <div className="talent-phone__input">
                    <strong>{country.dial}</strong>
                    <input
                      value={phoneNational}
                      onChange={(event) =>
                        setPhoneNational(country.format(event.target.value))
                      }
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder={country.placeholder}
                      required
                      aria-label="Número de WhatsApp"
                    />
                  </div>
                </label>
              </div>
              <small>O número será normalizado no padrão internacional E.164.</small>
            </div>

            <label>
              <span>Cidade / Estado *</span>
              <input
                name="location"
                autoComplete="off"
                inputMode="text"
                enterKeyHint="next"
                required
                maxLength={120}
              />
            </label>

            <label>
              <span>LinkedIn</span>
              <input
                name="linkedin_url"
                type="url"
                inputMode="url"
                placeholder="https://linkedin.com/in/..."
                maxLength={300}
              />
            </label>

            <label>
              <span>Portfólio / GitHub / Site</span>
              <input
                name="portfolio_url"
                type="url"
                inputMode="url"
                placeholder="https://..."
                maxLength={300}
              />
            </label>

            <label>
              <span>Área de interesse *</span>
              <select name="interest_area" required defaultValue={initialArea}>
                <option value="">Selecione</option>
                <option>Consultoria de implantação de IA</option>
                <option>Engenharia & IA</option>
                <option>Comercial & Parcerias</option>
                <option>Banco de Talentos</option>
                <option>Produto & Design</option>
                <option>Operações & Projetos</option>
                <option>Outro</option>
              </select>
            </label>

            <label>
              <span>Anos de experiência</span>
              <select name="experience_years">
                <option value="">Selecione</option>
                <option value="0-2">0–2 anos</option>
                <option value="3-5">3–5 anos</option>
                <option value="6-10">6–10 anos</option>
                <option value="11-15">11–15 anos</option>
                <option value="16+">16+ anos</option>
              </select>
            </label>

            <label>
              <span>Disponibilidade</span>
              <select name="availability">
                <option value="">Selecione</option>
                <option>Imediata</option>
                <option>Até 30 dias</option>
                <option>Até 60 dias</option>
                <option>Projetos pontuais</option>
                <option>A combinar</option>
              </select>
            </label>

            {type === "consultant" ? (
              <>
                <label className="talent-form__wide">
                  <span>Especialidade / setor de atuação *</span>
                  <input name="consulting_specialty" required maxLength={180} />
                </label>
                <label className="talent-form__wide">
                  <span>Experiência com IA / transformação / implantação</span>
                  <textarea name="consulting_experience" rows={4} maxLength={1200} />
                </label>
              </>
            ) : null}

            <label className="talent-form__wide">
              <span>Apresentação profissional *</span>
              <textarea
                name="introduction"
                rows={6}
                required
                maxLength={1800}
                placeholder="Conte quem você é, sua experiência e como gostaria de contribuir com a PatroAI."
              />
            </label>

            <label className="talent-form__wide talent-upload">
              <span>Currículo / perfil profissional *</span>
              <small>PDF, DOC ou DOCX · até 10 MB</small>
              <input
                name="resume"
                type="file"
                required
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setResumeName(
                    file
                      ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`
                      : "Nenhum arquivo selecionado.",
                  );
                }}
              />
              <em>{resumeName}</em>
            </label>

            <label className="talent-consent talent-form__wide">
              <input name="consent" type="checkbox" value="true" required />
              <span>
                Autorizo a PatroAI a utilizar os dados enviados exclusivamente para
                análise desta candidatura e contato relacionado a oportunidades
                profissionais.
              </span>
            </label>
          </div>

          <div className="talent-form__footer">
            <div>
              <p
                className={`talent-form__status ${statusKind ? `is-${statusKind}` : ""}`}
                role="status"
                aria-live="polite"
              >
                {status}
              </p>
              <small>O currículo precisa ser reanexado se esta aba for fechada.</small>
            </div>
            <button className="talent-submit" type="submit" disabled={submitting}>
              {submitting ? "Enviando…" : "Enviar candidatura"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
