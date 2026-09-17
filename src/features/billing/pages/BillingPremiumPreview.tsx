import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { getPlatformCapability, REAL_MONEY_ENABLED } from "../../capabilities/registry";
import { MockBillingApi } from "../api/billingApi";
import BillingStatusBadge from "../components/BillingStatusBadge";
import { useBillingPreview } from "../hooks/useBillingPreview";
import "../../premium-preview.css";

function money(minor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(minor / 100);
}

export default function BillingPremiumPreview() {
  const capability = getPlatformCapability("billing.ui_preview", {
    developmentPreview: import.meta.env.DEV,
  });
  const realHttp = getPlatformCapability("billing.real_http");
  const api = useMemo(() => new MockBillingApi(), []);
  const { snapshot, status, error, createCheckout, reconcile } = useBillingPreview(
    api,
    capability.enabled,
  );

  if (!capability.enabled) {
    return (
      <main className="premium-preview" id="main-content">
        <div className="premium-preview__frame">
          <span className="premium-kicker">EFATÁ 777 · BILLING</span>
          <h1>Billing Premium preparado, integração real bloqueada.</h1>
          <p>
            A superfície visual existe como implementação de desenvolvimento, mas o contrato
            financeiro canônico ainda não existe no backend. Nenhuma cobrança real é iniciada.
          </p>
          <Link className="premium-link" to="/app">Voltar à Plataforma</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="premium-preview" id="main-content">
      <div className="premium-preview__frame">
        <header className="premium-preview__header">
          <div>
            <span className="premium-kicker">EFATÁ 777 · BILLING PREMIUM</span>
            <h1>Visão financeira em modo de qualificação.</h1>
            <p>
              UX completa com adapter tipado e fixtures controladas. O browser não acessa
              Asaas, não possui segredo financeiro e não decide autoridade de tenant.
            </p>
          </div>
          <BillingStatusBadge />
        </header>

        <section className="premium-callout" aria-label="Estado do contrato financeiro">
          <strong>Real HTTP: {realHttp.status}</strong>
          <span>{realHttp.note}</span>
          <span>Dinheiro real: {REAL_MONEY_ENABLED ? "habilitado" : "desabilitado"}</span>
        </section>

        {status === "loading" ? <p role="status">Carregando preview financeiro…</p> : null}
        {status === "error" ? <p className="premium-error" role="alert">{error}</p> : null}

        {snapshot ? (
          <>
            <section className="premium-grid" aria-labelledby="billing-overview">
              <article className="premium-card">
                <span>Carteira demonstrativa</span>
                <strong id="billing-overview">{money(snapshot.wallet.available_minor)}</strong>
                <small>Sem autoridade financeira no cliente.</small>
              </article>
              <article className="premium-card">
                <span>Pendente</span>
                <strong>{money(snapshot.wallet.pending_minor)}</strong>
                <small>Valor mock, nunca reconciliado pelo browser.</small>
              </article>
              <article className="premium-card">
                <span>Integração backend</span>
                <strong>Bloqueada</strong>
                <small>Awaiting canonical OpenAPI Billing contract.</small>
              </article>
            </section>

            <section className="premium-section">
              <div className="premium-section__heading">
                <div>
                  <span className="premium-kicker">PLANOS</span>
                  <h2>Checkout UX sem cobrança real</h2>
                </div>
              </div>
              <div className="premium-grid premium-grid--plans">
                {snapshot.plans.map((plan) => (
                  <article className="premium-card" key={plan.id}>
                    <span>{plan.recommended ? "RECOMENDADO · MOCK" : "MOCK"}</span>
                    <h3>{plan.name}</h3>
                    <strong>{money(plan.amount_minor)} / mês</strong>
                    <p>{plan.description}</p>
                    <button
                      type="button"
                      disabled={status === "submitting" || status === "reconciling"}
                      onClick={() => void createCheckout(plan.id)}
                    >
                      {status === "submitting" ? "Preparando…" : "Simular checkout"}
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="premium-section">
              <div className="premium-section__heading">
                <div>
                  <span className="premium-kicker">RECONCILIAÇÃO</span>
                  <h2>Retorno nunca marca pagamento por redirect.</h2>
                </div>
              </div>
              <article className="premium-card premium-card--wide">
                {snapshot.checkout ? (
                  <>
                    <strong>{snapshot.checkout.status}</strong>
                    <p>
                      O estado só muda após resposta do adapter. Redirect, querystring,
                      localStorage ou email não possuem autoridade financeira.
                    </p>
                    <button
                      type="button"
                      disabled={status === "submitting" || status === "reconciling"}
                      onClick={() => void reconcile()}
                    >
                      {status === "reconciling" ? "Reconciliando…" : "Simular reconciliação"}
                    </button>
                  </>
                ) : (
                  <p>Nenhum checkout mock iniciado.</p>
                )}
              </article>
            </section>

            <section className="premium-section">
              <div className="premium-section__heading">
                <div>
                  <span className="premium-kicker">LEDGER</span>
                  <h2>Estados de refund e chargeback em fixture controlada.</h2>
                </div>
              </div>
              <div className="premium-ledger">
                {snapshot.ledger.map((entry) => (
                  <article className="premium-ledger__row" key={entry.id}>
                    <div>
                      <strong>{entry.label}</strong>
                      <span>{entry.type}</span>
                    </div>
                    <strong>{money(entry.amount_minor)}</strong>
                  </article>
                ))}
              </div>
            </section>

            <section className="premium-section">
              <div className="premium-section__heading">
                <div>
                  <span className="premium-kicker">ADMIN BILLING</span>
                  <h2>Shell preparado; autorização real continua backend-owned.</h2>
                </div>
              </div>
              <article className="premium-card premium-card--wide">
                <p>
                  Nenhuma permissão administrativa é concedida por esta tela. O módulo apenas
                  prepara apresentação; backend authorization permanece mandatória.
                </p>
              </article>
            </section>
          </>
        ) : null}

        <footer className="premium-preview__footer">
          <Link className="premium-link" to="/app">Voltar à Plataforma</Link>
        </footer>
      </div>
    </main>
  );
}
