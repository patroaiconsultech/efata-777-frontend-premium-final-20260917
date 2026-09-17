import type {
  BillingApi,
  BillingCheckoutPreview,
} from "./billingContracts";
import {
  mockLedger,
  mockPlans,
  mockWallet,
} from "../fixtures/billingFixtures";

export class BillingContractUnavailableError extends Error {
  constructor() {
    super("BILLING_BACKEND_CONTRACT_UNAVAILABLE");
    this.name = "BillingContractUnavailableError";
  }
}

function abortableDelay(signal?: AbortSignal, delayMs = 90): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(resolve, delayMs);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export class MockBillingApi implements BillingApi {
  async getPlans(signal?: AbortSignal) {
    await abortableDelay(signal);
    return structuredClone(mockPlans);
  }

  async getWallet(signal?: AbortSignal) {
    await abortableDelay(signal);
    return structuredClone(mockWallet);
  }

  async getLedger(signal?: AbortSignal) {
    await abortableDelay(signal);
    return structuredClone(mockLedger);
  }

  async createCheckoutPreview(
    planId: string,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<BillingCheckoutPreview> {
    if (!idempotencyKey.trim()) throw new Error("IDEMPOTENCY_KEY_REQUIRED");
    if (!mockPlans.some((plan) => plan.id === planId))
      throw new Error("MOCK_PLAN_NOT_FOUND");
    await abortableDelay(signal, 140);
    return {
      source: "mock",
      environment: "development",
      real_money: false,
      checkout_id: `mock-checkout-${planId}`,
      plan_id: planId,
      status: "mock_pending",
      redirect_url: null,
      idempotency_key: idempotencyKey,
    };
  }

  async reconcileCheckout(
    checkoutId: string,
    signal?: AbortSignal,
  ): Promise<BillingCheckoutPreview> {
    await abortableDelay(signal, 160);
    return {
      source: "mock",
      environment: "development",
      real_money: false,
      checkout_id: checkoutId,
      plan_id: checkoutId.replace("mock-checkout-", ""),
      status: "mock_confirmed",
      redirect_url: null,
      idempotency_key: "mock-reconcile-existing",
    };
  }
}

export class HttpBillingApi implements BillingApi {
  private unavailable(): never {
    throw new BillingContractUnavailableError();
  }

  async getPlans(): Promise<never> {
    return this.unavailable();
  }

  async getWallet(): Promise<never> {
    return this.unavailable();
  }

  async getLedger(): Promise<never> {
    return this.unavailable();
  }

  async createCheckoutPreview(): Promise<never> {
    return this.unavailable();
  }

  async reconcileCheckout(): Promise<never> {
    return this.unavailable();
  }
}
