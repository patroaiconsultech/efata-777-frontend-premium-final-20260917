import type {
  BillingCheckoutPreview,
  BillingLedgerEntry,
  BillingPlan,
  BillingWallet,
} from "../api/billingContracts";

export type BillingUiState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ready";
      plans: BillingPlan[];
      wallet: BillingWallet;
      ledger: BillingLedgerEntry[];
      checkout: BillingCheckoutPreview | null;
    }
  | { status: "submitting"; snapshot: Extract<BillingUiState, { status: "ready" }> }
  | { status: "reconciling"; snapshot: Extract<BillingUiState, { status: "ready" }> }
  | { status: "error"; message: string };

export const initialBillingUiState: BillingUiState = { status: "idle" };
