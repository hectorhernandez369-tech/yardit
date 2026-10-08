const RUNTIME_STORAGE_KEY = "yardit_runtime_environment_v1";
const LEGACY_ANDROID_WRAPPER_KEY = "yardit_play_wrapper_detected_v1";

function safeGetStorage(key) {
  try {
    return sessionStorage.getItem(key) || localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function safeRememberRuntime(runtime) {
  if (!runtime || runtime === "browser" || runtime === "pwa") return;
  try {
    sessionStorage.setItem(RUNTIME_STORAGE_KEY, runtime);
    localStorage.setItem(RUNTIME_STORAGE_KEY, runtime);
  } catch {}
}

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent || "") ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalonePwa() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    window.navigator?.standalone === true;
}

function detectAndroidAppWrapper() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const androidAppReferrer = document.referrer?.startsWith("android-app://");
  const androidWebView = /Android/i.test(ua) && (
    /;\s*wv\)/i.test(ua) ||
    /\bwv\b/i.test(ua) ||
    (/Version\/4\.0/i.test(ua) && /Chrome\//i.test(ua))
  );
  return androidAppReferrer || androidWebView;
}

function detectIosAppWrapper() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (!isIosDevice() || isStandalonePwa()) return false;

  const ua = navigator.userAgent || "";
  const isNormalSafari = /Safari\//i.test(ua) && /Version\//i.test(ua);
  const isKnownIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua);
  const wkWebViewLike = /AppleWebKit/i.test(ua) && !isNormalSafari && !isKnownIosBrowser;
  const hasNativeMessageHandlers = !!window.webkit?.messageHandlers &&
    Object.keys(window.webkit.messageHandlers || {}).length > 0;

  return wkWebViewLike || hasNativeMessageHandlers;
}

export function getRuntimeEnvironment() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "browser";

  if (detectAndroidAppWrapper()) {
    safeRememberRuntime("android_app");
    return "android_app";
  }

  if (detectIosAppWrapper()) {
    safeRememberRuntime("ios_app");
    return "ios_app";
  }

  const remembered = safeGetStorage(RUNTIME_STORAGE_KEY);
  if (remembered === "android_app" || remembered === "ios_app") return remembered;
  if (safeGetStorage(LEGACY_ANDROID_WRAPPER_KEY) === "true") {
    safeRememberRuntime("android_app");
    return "android_app";
  }

  if (isStandalonePwa()) return "pwa";
  return "browser";
}

export function isNativeAppRuntime() {
  const runtime = getRuntimeEnvironment();
  return runtime === "android_app" || runtime === "ios_app";
}

export function isAndroidAppRuntime() {
  return getRuntimeEnvironment() === "android_app";
}

export function isIosAppRuntime() {
  return getRuntimeEnvironment() === "ios_app";
}

export function isWebRuntime() {
  const runtime = getRuntimeEnvironment();
  return runtime === "browser" || runtime === "pwa";
}
