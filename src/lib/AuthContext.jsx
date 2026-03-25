import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { isGuestMode, setGuestMode, clearGuestMode } from './guestMode';

const AuthContext = createContext();
const AUTH_RETURN_TO_KEY = 'yardit_auth_return_to_v1';
const AUTH_RETURN_TO_MAX_AGE_MS = 30 * 60 * 1000;

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

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      console.log('AUTH_DEBUG checkAppState:start', {
        hasToken: !!appParams.token,
        appId: appParams.appId,
        serverUrl: appParams.serverUrl,
      });
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
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

  const checkUserAuth = async () => {
    try {
      console.log('AUTH_DEBUG checkUserAuth:start', { hasToken: !!appParams.token });
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      console.log('AUTH_DEBUG base44.auth.me:success', {
        userId: currentUser?.id,
        email: currentUser?.email,
      });
      clearGuestMode();
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

  const logout = (shouldRedirect = true) => {
    clearAuthReturnTo();
    clearGuestMode();
    setUser(null);
    setIsAuthenticated(false);
    setIsGuest(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
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

    clearGuestMode();
    setIsGuest(false);
    saveAuthReturnTo(window.location.href);
    base44.auth.redirectToLogin(window.location.href);
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