export const isIosDevice = () => {
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
};

export const isStandaloneInstalled = () => {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
};

export const canUseBrowserInstallPrompt = (deferredPrompt) => {
  return !!deferredPrompt && !isStandaloneInstalled() && !isIosDevice();
};