const DEV_CLEANUP_RELOAD_KEY = "yardit_dev_runtime_cleanup_reload";

export async function prepareDevelopmentRuntime() {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;

  const alreadyReloaded = sessionStorage.getItem(DEV_CLEANUP_RELOAD_KEY) === "true";
  sessionStorage.removeItem(DEV_CLEANUP_RELOAD_KEY);

  const registrations = "serviceWorker" in navigator
    ? await navigator.serviceWorker.getRegistrations()
    : [];
  const unregisterResults = await Promise.all(registrations.map((registration) => registration.unregister()));

  const cacheKeys = "caches" in window ? await window.caches.keys() : [];
  const cacheResults = await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));

  const removedStaleRuntime = unregisterResults.some(Boolean) || cacheResults.some(Boolean);
  if (!removedStaleRuntime || alreadyReloaded) return false;

  sessionStorage.setItem(DEV_CLEANUP_RELOAD_KEY, "true");
  return true;
}