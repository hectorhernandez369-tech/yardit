import { base44 } from "@/api/base44Client";

const PLAY_WRAPPER_KEY = "yardit_play_wrapper_detected_v1";
const WEB_PUSH_SETUP_URL = "https://yardit.app/PushSetup";

function rememberWrapper() {
  try {
    sessionStorage.setItem(PLAY_WRAPPER_KEY, "true");
    localStorage.setItem(PLAY_WRAPPER_KEY, "true");
  } catch {}
}

export function isPlayStoreWebWrapper() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const androidReferrer = document.referrer?.startsWith("android-app://");
  const userAgent = navigator.userAgent || "";
  const androidWebView = /Android/i.test(userAgent) && (/;\s*wv\)/i.test(userAgent) || /\bwv\b/i.test(userAgent));
  if (androidReferrer || androidWebView) {
    rememberWrapper();
    return true;
  }
  try {
    return sessionStorage.getItem(PLAY_WRAPPER_KEY) === "true" || localStorage.getItem(PLAY_WRAPPER_KEY) === "true";
  } catch {
    return false;
  }
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