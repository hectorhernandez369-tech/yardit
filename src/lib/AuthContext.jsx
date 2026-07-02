import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams, captureAuthTokenFromCurrentUrl, waitForOAuthAccessToken } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { isGuestMode, setGuestMode, clearGuestMode } from './guestMode';
import { logUserActivity, logUserActivityOncePerSession } from './logUserActivity';
import { normalizeUser } from '@/lib/normalizeUser';
import { recordAuthDebugEvent } from '@/lib/authDebug';

const AuthContext = createContext();
const AUTH_RETURN_TO_KEY = 'yardit_auth_return_to_v1';
const AUTH_RETURN_TO_MAX_AGE_MS = 30 * 60 * 1000;
const RETURNING_USER_KEY = 'yardit_returning_user_v1';
const PLAY_WRAPPER_KEY = 'yardit_play_wrapper_detected_v1';
const AUTH_CLIENT_INITIAL_TOKEN = appParams.token;

const isPlayAppWrapper = () => {
  if (typeof window === 'undefined') return false;

  const androidAppReferrer = document.referrer?.startsWith('android-app://');
  if (androidAppReferrer) {
    try {
      sessionStorage.setItem(PLAY_WRAPPER_KEY, 'true');
      localStorage.setItem(PLAY_WRAPPER_KEY, 'true');
    } catch {}
    return true;
  }

  try {
    return sessionStorage.getItem(PLAY_WRAPPER_KEY) === 'true' || localStorage.getItem(PLAY_WRAPPER_KEY) === 'true';
  } catch {
    return false;
  }
};

const reloadForNewlyCapturedToken = (capture, source = 'unknown') => {
  if (!capture?.token || capture.token === AUTH_CLIENT_INITIAL_TOKEN) return false;

  console.log('AUTH_DEBUG tokenAvailableAfterClientInit -> reload', {
    source,
    storedBase44AccessToken: true,
    capturedFromCallback: !!capture.captured,
  });
  window.location.replace(`${window.location.pathname}${window.location.search}${window.location.hash}`);
  return true;
};

const saveAuthReturnTo = (url) => {
  try {
    localStorage.setItem(AUTH_RETURN_TO_KEY, JSON.stringify({ url, createdAt: Date.now() }));
  } catch {}
};

const clearAuthReturnTo = () => {
  try {
    localStorage.removeItem(AUTH_RETURN_TO_KEY);
  } catch {}
};

const restoreAuthReturnTo = () => {
  try {
    const raw = localStorage.getItem(AUTH_RETURN_TO_KEY);
    if (!raw) return false;

    const saved = JSON.parse(raw);
    const targetUrl = saved?.url;
    const createdAt = Number(saved?.createdAt || 0);

    if (!targetUrl || !createdAt || Date.now() - createdAt > AUTH_RETURN_TO_MAX_AGE_MS) {
      clearAuthReturnTo();
      return false;
    }

    const current = new URL(window.location.href);
    const target = new URL(targetUrl, window.location.origin);

    if (target.origin !== window.location.origin) {
      clearAuthReturnTo();
      return false;
    }

    const targetPath = target.pathname.toLowerCase();
    if (targetPath === "/login" || targetPath === "/accountoptions") {
      clearAuthReturnTo();
      return false;
    }

    if (`${current.pathname}${current.search}${current.hash}` === `${target.pathname}${target.search}${target.hash}`) {
      clearAuthReturnTo();
      return false;
    }

    clearAuthReturnTo();
    window.location.replace(target.toString());
    return true;
  } catch {
    clearAuthReturnTo();
    return false;
  }
};

export const AuthProvider = ({ children }) => {
   const [user, setUser] = useState(null);
   const [isAuthenticated, setIsAuthenticated] = useState(false);
   const [isGuest, setIsGuest] = useState(isGuestMode());
   const [isLoadingAuth, setIsLoadingAuth] = useState(true);
   const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
   const [authError, setAuthError] = useState(null);
   const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  const checkUserAuth = async () => {
    try {
      console.log('AUTH_DEBUG checkUserAuth:start', { hasToken: !!appParams.token });
      recordAuthDebugEvent('base44_auth_me_start', { hasToken: !!appParams.token });
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = normalizeUser(await base44.auth.me());
      console.log('AUTH_DEBUG base44.auth.me:success', {
        userId: currentUser?.id,
        email: currentUser?.email,
      });
      recordAuthDebugEvent('base44_auth_me_success', {
        userId: currentUser?.id,
        email: currentUser?.email,
      });
      if (currentUser?.accountStatus === 'deleted' || currentUser?.account_deletion_status === 'completed') {
        await base44.auth.logout('/ComingSoon');
        setUser(null);
        setIsAuthenticated(false);
        setIsGuest(false);
        setIsLoadingAuth(false);
        setAuthError({ type: 'auth_required', message: 'Account deleted' });
        return;
      }
      clearGuestMode();
      try {
        localStorage.setItem(RETURNING_USER_KEY, "true");
      } catch {}
      setIsGuest(false);
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      restoreAuthReturnTo();
      setAuthError(null);
    } catch (error) {
      console.error('User auth check failed:', error);
      console.log('AUTH_DEBUG base44.auth.me:error', {
        status: error?.status,
        data: error?.data,
        message: error?.message,
      });
      recordAuthDebugEvent('base44_auth_me_error', {
        status: error?.status,
        message: error?.message,
      });
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const checkAppState = async () => {
    try {
      console.log('AUTH_DEBUG checkAppState:start', {
        hasToken: !!appParams.token,
        appId: appParams.appId,
        serverUrl: appParams.serverUrl,
      });
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const oauthTokenCapture = await waitForOAuthAccessToken({
        timeoutMs: AUTH_CLIENT_INITIAL_TOKEN ? 0 : 1600,
        intervalMs: 120,
      });

      if (reloadForNewlyCapturedToken(oauthTokenCapture, 'checkAppState')) {
        return;
      }

      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `${appParams.serverUrl}/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });

      try {
        console.log('AUTH_DEBUG checkAppState:publicSettings:request', {
          url: `${appParams.serverUrl}/api/apps/public/prod/public-settings/by-id/${appParams.appId}`,
          hasToken: !!appParams.token,
        });
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        console.log('AUTH_DEBUG checkAppState:publicSettings:success', {
          status: publicSettings?.status,
          hasData: !!publicSettings,
        });
        setAppPublicSettings(publicSettings);

        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          console.log('AUTH_DEBUG checkAppState:tokenPresent -> checkUserAuth');
          await checkUserAuth();
        } else {
          console.log('AUTH_DEBUG checkAppState:noToken');
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        console.log('AUTH_DEBUG checkAppState:publicSettings:error', {
          status: appError?.status,
          data: appError?.data,
          message: appError?.message,
          reason: appError?.data?.extra_data?.reason,
        });

        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    checkAppState();
  }, []);

  useEffect(() => {
    const checkForReturnedOAuthToken = () => {
      const capture = captureAuthTokenFromCurrentUrl();
      reloadForNewlyCapturedToken(capture, 'appResume');
    };

    const timers = [500, 1500, 3000, 5000].map((delay) => window.setTimeout(checkForReturnedOAuthToken, delay));
    window.addEventListener('focus', checkForReturnedOAuthToken);
    window.addEventListener('pageshow', checkForReturnedOAuthToken);
    window.addEventListener('hashchange', checkForReturnedOAuthToken);
    window.addEventListener('popstate', checkForReturnedOAuthToken);
    document.addEventListener('visibilitychange', checkForReturnedOAuthToken);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('focus', checkForReturnedOAuthToken);
      window.removeEventListener('pageshow', checkForReturnedOAuthToken);
      window.removeEventListener('hashchange', checkForReturnedOAuthToken);
      window.removeEventListener('popstate', checkForReturnedOAuthToken);
      document.removeEventListener('visibilitychange', checkForReturnedOAuthToken);
    };
  }, []);

  useEffect(() => {
    const handleUserUpdated = (event) => {
      setUser(normalizeUser(event.detail));
      setIsAuthenticated(true);
      setIsGuest(false);
    };

    window.addEventListener("yardit:user-updated", handleUserUpdated);
    return () => window.removeEventListener("yardit:user-updated", handleUserUpdated);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    logUserActivityOncePerSession(`yardit_login_${user.id}`, {
      user_id: user.id,
      event_type: "login",
      event_label: "Logged In",
      target_type: "account",
      target_id: user.id,
      source_page: window.location.pathname,
    }).catch(() => null);

    const createdAt = new Date(user.created_date || 0).getTime();
    const wasJustCreated = createdAt && Date.now() - createdAt <= 15 * 60 * 1000;

    if (!wasJustCreated) return;

    base44.entities.UserActivityLog.filter({ user_id: user.id, event_type: "account_created" }).then((existing) => {
      if (existing.length > 0) return;
      return logUserActivity({
        user_id: user.id,
        event_type: "account_created",
        event_label: "Account Created",
        target_type: "account",
        target_id: user.id,
        source_page: window.location.pathname,
      });
    }).catch(() => null);
  }, [isAuthenticated, user]);

  const logout = (redirectUrl) => {
    const currentUser = user;
    const finishLogout = () => {
      if (redirectUrl) {
        base44.auth.logout(redirectUrl);
      } else {
        base44.auth.logout();
      }
    };

    clearAuthReturnTo();
    clearGuestMode();
    try {
      localStorage.setItem(RETURNING_USER_KEY, "true");
    } catch {}
    setUser(null);
    setIsAuthenticated(false);
    setIsGuest(false);

    if (!currentUser?.id) {
      finishLogout();
      return;
    }

    let didFinish = false;
    const safeFinish = () => {
      if (didFinish) return;
      didFinish = true;
      finishLogout();
    };

    const timeoutId = window.setTimeout(safeFinish, 400);

    logUserActivity({
      user_id: currentUser.id,
      event_type: "logout",
      event_label: "Logged Out",
      target_type: "account",
      target_id: currentUser.id,
      source_page: window.location.pathname,
    }).finally(() => {
      window.clearTimeout(timeoutId);
      safeFinish();
    });
  };

  const enterGuestMode = () => {
    setGuestMode();
    setIsGuest(true);
    setAuthError(null);
  };

  const navigateToLogin = () => {
    console.log('AUTH_DEBUG navigateToLogin', {
      hasToken: !!appParams.token,
      currentUrl: window.location.href,
      authError,
      isGuest
    });

    const playWrapper = isPlayAppWrapper();
    const loginReturnUrl = playWrapper ? `${window.location.origin}/?auth_callback=play` : window.location.href;
    recordAuthDebugEvent('redirect_to_login', {
      playWrapper,
      loginReturnUrl,
      returnStrategy: playWrapper ? 'play_start_url' : 'current_url',
      currentUrl: window.location.href,
    });

    clearGuestMode();
    setIsGuest(false);
    saveAuthReturnTo(window.location.href);
    base44.auth.redirectToLogin(loginReturnUrl);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
      isGuest,
      enterGuestMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};