import type {
  BillingLedgerEntry,
  BillingPlan,
  BillingWallet,
} from "../api/billingContracts";

const envelope = {
  source: "mock" as const,
  environment: "development" as const,
  real_money: false as const,
};

export const mockPlans: BillingPlan[] = [
  {
    ...envelope,
    id: "mock-starter",
    name: "Starter",
    description: "Preview de estrutura comercial. Sem cobrança real.",
    amount_minor: 0,
    currency: "BRL",
    interval: "month",
  },
  {
    ...envelope,
    id: "mock-premium",
    name: "Premium",
    description: "Preview UX para futura contratação, sem endpoint financeiro ativo.",
    amount_minor: 12900,
    currency: "BRL",
    interval: "month",
    recommended: true,
  },
];

export const mockWallet: BillingWallet = {
  ...envelope,
  currency: "BRL",
  available_minor: 25000,
  pending_minor: 0,
};

export const mockLedger: BillingLedgerEntry[] = [
  {
    ...envelope,
    id: "mock-ledger-credit",
    type: "credit",
    amount_minor: 25000,
    currency: "BRL",
    created_at: "2026-09-12T12:00:00.000Z",
    label: "Crédito demonstrativo",
  },
  {
    ...envelope,
    id: "mock-ledger-refund",
    type: "refund",
    amount_minor: 4900,
    currency: "BRL",
    created_at: "2026-09-11T12:00:00.000Z",
    label: "Reembolso demonstrativo reconciliado",
  },
  {
    ...envelope,
    id: "mock-ledger-chargeback",
    type: "chargeback",
    amount_minor: 2900,
    currency: "BRL",
    created_at: "2026-09-10T12:00:00.000Z",
    label: "Chargeback demonstrativo reconciliado",
  },
];
