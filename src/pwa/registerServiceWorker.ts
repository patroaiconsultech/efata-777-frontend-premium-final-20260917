export const UPDATE_EVENT = "patroai:pwa-update";
export const REGISTRATION_ERROR_EVENT = "patroai:pwa-registration-error";

function isLegacyPwaLaunch(): boolean {
  const url = new URL(window.location.href);
  return (
    url.pathname === "/app" &&
    (url.searchParams.get("source") || "").startsWith("pwa")
  );
}

async function clearLegacyBrandCaches(): Promise<void> {
  if (!("caches" in window)) return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => /orkio|efata777-v(?:[0-9]|1[0-4])-/i.test(key)).map((key) => caches.delete(key)));
  } catch {}
}
function installControllerRefresh(): void {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloadIssued = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloadIssued) return;
    reloadIssued = true;
    // Auto-activating releases must also reload the document so the newly
    // controlled page executes the matching JS/CSS bundle.
    window.location.reload();
  });
}

export async function registerServiceWorker(): Promise<void> {
  if (isLegacyPwaLaunch()) {
    window.location.replace("/?source=pwa&experience=immersive&v=16");
    return;
  }
  if (!("serviceWorker" in navigator)) return;

  const localHostnames = new Set(["localhost", "127.0.0.1", "::1"]);
  if (
    window.location.protocol !== "https:" &&
    !localHostnames.has(window.location.hostname)
  ) {
    return;
  }

  await clearLegacyBrandCaches();
  installControllerRefresh();

  window.addEventListener(
    "load",
    async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        // V13 uses a single update model: the worker auto-activates via
        // skipWaiting(), while controllerchange reloads the page. Do not
        // dispatch a manual "waiting worker" banner for a worker that is
        // intentionally transient.
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        await registration.update();
      } catch (error) {
        window.dispatchEvent(
          new CustomEvent(REGISTRATION_ERROR_EVENT, {
            detail: {
              message:
                error instanceof Error
                  ? error.message
                  : "Unknown service worker registration error",
            },
          }),
        );
        console.warn("[PWA] service worker registration failed", error);
      }
    },
    { once: true },
  );
}
