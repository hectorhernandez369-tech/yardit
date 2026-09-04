const PLAY_WRAPPER_KEY = "yardit_play_wrapper_detected_v1";
const WEB_PUSH_SETUP_URL = "https://yardit.app/Notifications?tab=settings&pushSetup=1";

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

export function getWebPushSetupUrl() {
  return WEB_PUSH_SETUP_URL;
}

export function openWebPushSetup() {
  if (typeof window === "undefined") return false;

  const url = getWebPushSetupUrl();
  try {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer external";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  } catch {
    try {
      window.open(url, "_blank", "noopener,noreferrer");
      return true;
    } catch {
      return false;
    }
  }
}
