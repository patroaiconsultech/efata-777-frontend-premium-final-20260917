export type BillingSource = "mock";
export type BillingEnvironment = "development";
export type BillingCurrency = "BRL";

export type BillingEnvelope = {
  source: BillingSource;
  environment: BillingEnvironment;
  real_money: false;
};

export type BillingPlan = BillingEnvelope & {
  id: string;
  name: string;
  description: string;
  amount_minor: number;
  currency: BillingCurrency;
  interval: "month";
  recommended?: boolean;
};

export type BillingWallet = BillingEnvelope & {
  currency: BillingCurrency;
  available_minor: number;
  pending_minor: number;
};

export type BillingLedgerEntry = BillingEnvelope & {
  id: string;
  type: "credit" | "debit" | "refund" | "chargeback";
  amount_minor: number;
  currency: BillingCurrency;
  created_at: string;
  label: string;
};

export type BillingCheckoutPreview = BillingEnvelope & {
  checkout_id: string;
  plan_id: string;
  status: "mock_pending" | "mock_reconciling" | "mock_confirmed";
  redirect_url: null;
  idempotency_key: string;
};

export type BillingSnapshot = {
  plans: BillingPlan[];
  wallet: BillingWallet;
  ledger: BillingLedgerEntry[];
  checkout: BillingCheckoutPreview | null;
};

export interface BillingApi {
  getPlans(signal?: AbortSignal): Promise<BillingPlan[]>;
  getWallet(signal?: AbortSignal): Promise<BillingWallet>;
  getLedger(signal?: AbortSignal): Promise<BillingLedgerEntry[]>;
  createCheckoutPreview(
    planId: string,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<BillingCheckoutPreview>;
  reconcileCheckout(
    checkoutId: string,
    signal?: AbortSignal,
  ): Promise<BillingCheckoutPreview>;
}
