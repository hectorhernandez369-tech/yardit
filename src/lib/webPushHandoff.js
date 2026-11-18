import { base44 } from "@/api/base44Client";
import { isAndroidAppRuntime, isNativeAppRuntime } from "@/lib/runtimeEnvironment";
const WEB_PUSH_SETUP_URL = "https://yardit.app/PushSetup";

export function isPlayStoreWebWrapper() {
  return isAndroidAppRuntime();
}

export function isAppStoreWrapper() {
  return isNativeAppRuntime();
}

export function getWebPushSetupUrl(token) {
  return `${WEB_PUSH_SETUP_URL}?token=${encodeURIComponent(token)}`;
}

export async function createWebPushSetupUrl() {
  const response = await base44.functions.invoke("pushSetupHandoff", { action: "create" });
  const token = response?.data?.token;
  if (!token) throw new Error("Push setup link could not be created");
  return getWebPushSetupUrl(token);
}

export function openPreparedWebPushSetup(url) {
  if (typeof window === "undefined" || !url) return false;
  const browserWindow = window.open(url, "_blank", "noopener,noreferrer");
  return !!browserWindow;
}

export async function openWebPushSetup() {
  if (typeof window === "undefined") return false;
  try {
    const url = await createWebPushSetupUrl();
    return openPreparedWebPushSetup(url);
  } catch {
    return false;
  }
}