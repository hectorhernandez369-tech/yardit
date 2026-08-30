import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getNativeLoginReturnUrl, isValidNativeAuthState } from '@/lib/nativeAuthBridge';
import YarditSplashScreen from '@/components/install/YarditSplashScreen';

export default function NativeAuthStart() {
  const state = new URLSearchParams(window.location.search).get('state') || '';
  const isValid = isValidNativeAuthState(state);

  useEffect(() => {
    if (isValid) base44.auth.redirectToLogin(getNativeLoginReturnUrl(state));
  }, [isValid, state]);

  if (!isValid) {
    return <main className="min-h-screen grid place-content-center bg-black p-6 text-center text-white"><h1 className="text-xl font-bold">Login link expired</h1><p className="mt-2">Return to Yardit and try signing in again.</p></main>;
  }

  return <YarditSplashScreen />;
}