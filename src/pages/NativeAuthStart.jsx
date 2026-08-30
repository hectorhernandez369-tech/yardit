import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getNativeLoginReturnUrl } from '@/lib/nativeAuthBridge';
import YarditSplashScreen from '@/components/install/YarditSplashScreen';

export default function NativeAuthStart() {
  useEffect(() => {
    base44.auth.redirectToLogin(getNativeLoginReturnUrl());
  }, []);

  return <YarditSplashScreen />;
}