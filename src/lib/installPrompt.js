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
  return !isStandaloneInstalled() && !isIosDevice();
};

export const syncInstallRecord = () => {
  if (isStandaloneInstalled()) {
    markAppInstalled();
    return true;
  }

  if (hasInstallRecord()) {
    localStorage.removeItem("yardit_app_installed");
  }

  return false;
};

export const shouldShowInstallButton = () => {
  syncInstallRecord();
  return !isStandaloneInstalled();
};