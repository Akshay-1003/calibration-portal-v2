const RECOVERY_KEY = "fe-web-vacl:stale-asset-recovery";
const RECOVERY_COOLDOWN_MS = 60_000;

const staleAssetPatterns = [
  "failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "importing a module script failed",
  "loading chunk",
  "chunkloaderror",
];

let reloadRequested = false;

function getErrorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  if (reason && typeof reason === "object" && "message" in reason) {
    const message = (reason as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return "";
}

function isStaleAssetError(reason: unknown): boolean {
  const message = getErrorMessage(reason).toLowerCase();
  return staleAssetPatterns.some((pattern) => message.includes(pattern));
}

export function recoverFromStaleAssetError(reason: unknown): boolean {
  if (
    reloadRequested ||
    typeof window === "undefined" ||
    !isStaleAssetError(reason)
  ) {
    return false;
  }

  const now = Date.now();
  let lastAttempt = Number.NaN;
  try {
    lastAttempt = Number(sessionStorage.getItem(RECOVERY_KEY));
  } catch {
    // Private browsing can deny session storage; reload protection still works per page.
  }
  if (Number.isFinite(lastAttempt) && now - lastAttempt < RECOVERY_COOLDOWN_MS) {
    return false;
  }

  reloadRequested = true;
  try {
    sessionStorage.setItem(RECOVERY_KEY, String(now));
  } catch {
    // Continue with a single in-memory recovery when session storage is unavailable.
  }
  window.location.reload();
  return true;
}

export function installStaleAssetRecovery(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("vite:preloadError", (event) => {
    if (recoverFromStaleAssetError(event)) {
      event.preventDefault();
    }
  });

  window.addEventListener("error", (event) => {
    recoverFromStaleAssetError(event.error ?? event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (recoverFromStaleAssetError(event.reason)) {
      event.preventDefault();
    }
  });
}

export function unregisterLegacyServiceWorkers(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  void navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .catch(() => {
      // Service worker cleanup must not prevent the application from rendering.
    });
}
