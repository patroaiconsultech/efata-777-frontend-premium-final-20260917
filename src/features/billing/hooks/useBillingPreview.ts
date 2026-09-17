import { useCallback, useEffect, useRef, useState } from "react";
import type { BillingApi } from "../api/billingContracts";
import type { BillingSnapshot } from "../api/billingContracts";

const POLLING_TIMEOUT_MS = 8_000;

function idempotencyKey(planId: string): string {
  return `mock:${planId}:${crypto.randomUUID()}`;
}

export function useBillingPreview(api: BillingApi, enabled: boolean) {
  const [snapshot, setSnapshot] = useState<BillingSnapshot | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "ready" | "submitting" | "reconciling" | "error"
  >("idle");
  const [error, setError] = useState("");
  const submitLock = useRef(false);
  const reconcileControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setStatus("loading");
    setError("");
    void Promise.all([
      api.getPlans(controller.signal),
      api.getWallet(controller.signal),
      api.getLedger(controller.signal),
    ])
      .then(([plans, wallet, ledger]) => {
        if (controller.signal.aborted) return;
        setSnapshot({ plans, wallet, ledger, checkout: null });
        setStatus("ready");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "BILLING_PREVIEW_LOAD_FAILED");
        setStatus("error");
      });
    return () => controller.abort();
  }, [api, enabled]);

  useEffect(() => {
    return () => {
      reconcileControllerRef.current?.abort();
      reconcileControllerRef.current = null;
    };
  }, []);

  const createCheckout = useCallback(
    async (planId: string) => {
      if (!enabled || submitLock.current || !snapshot) return;
      submitLock.current = true;
      setStatus("submitting");
      setError("");
      const controller = new AbortController();
      try {
        const checkout = await api.createCheckoutPreview(
          planId,
          idempotencyKey(planId),
          controller.signal,
        );
        setSnapshot((current) => (current ? { ...current, checkout } : current));
        setStatus("ready");
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "CHECKOUT_PREVIEW_FAILED");
        setStatus("error");
      } finally {
        submitLock.current = false;
      }
    },
    [api, enabled, snapshot],
  );

  const reconcile = useCallback(async () => {
    if (!enabled || !snapshot?.checkout || submitLock.current) return;
    submitLock.current = true;
    setStatus("reconciling");
    setError("");
    reconcileControllerRef.current?.abort();
    const controller = new AbortController();
    reconcileControllerRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), POLLING_TIMEOUT_MS);
    try {
      const checkout = await api.reconcileCheckout(
        snapshot.checkout.checkout_id,
        controller.signal,
      );
      setSnapshot((current) => (current ? { ...current, checkout } : current));
      setStatus("ready");
    } catch (reason) {
      setError(
        reason instanceof DOMException && reason.name === "AbortError"
          ? "BILLING_RECONCILIATION_TIMEOUT"
          : reason instanceof Error
            ? reason.message
            : "BILLING_RECONCILIATION_FAILED",
      );
      setStatus("error");
    } finally {
      window.clearTimeout(timeout);
      controller.abort();
      if (reconcileControllerRef.current === controller) {
        reconcileControllerRef.current = null;
      }
      submitLock.current = false;
    }
  }, [api, enabled, snapshot?.checkout]);

  return { snapshot, status, error, createCheckout, reconcile };
}
