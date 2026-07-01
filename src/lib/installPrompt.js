export const isIosDevice = () => {
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
};

export const isStandaloneInstalled = () => {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
};

export const hasInstallRecord = () => {
  return localStorage.getItem("yardit_app_installed") === "true";
};

export const markAppInstalled = () => {
  localStorage.setItem("yardit_app_installed", "true");
};

export const canUseBrowserInstallPrompt = () => {
  return !isStandaloneInstalled() && !hasInstallRecord() && !isIosDevice();
};

export const shouldShowInstallButton = () => {
  return !isStandaloneInstalled();
};