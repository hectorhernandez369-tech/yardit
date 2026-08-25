import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { isNativeYarditApp } from '@/lib/nativePushNotifications';
import { getNativeLoginReturnUrl } from '@/lib/nativeAuthBridge';

const LOGO = 'https://media.base44.com/images/public/690f554506edf795e5d84121/e68545fc5_file_00000000f5dc71f5a5c8b2e79fd116b0.png';

export default function NativeLogin() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!isNativeYarditApp()) {
    return <div className="min-h-screen flex items-center justify-center p-6">Native login is only used inside the Yardit mobile app.</div>;
  }

  const finishLogin = async (accessToken) => {
    if (accessToken) base44.auth.setToken(accessToken, true);
    window.location.replace('/');
  };

  const login = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await base44.auth.loginViaEmailPassword(email.trim(), password);
      await finishLogin(result?.access_token);
    } catch (err) {
      setError(err?.message || 'Login failed. Check your email and password.');
    } finally {
      setBusy(false);
    }
  };

  const register = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await base44.auth.register({ email: email.trim(), password });
      setMode('verify');
      setMessage('We sent a verification code to your email.');
    } catch (err) {
      setError(err?.message || 'Could not create the account.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await base44.auth.verifyOtp({ email: email.trim(), otpCode: otp.trim() });
      const result = await base44.auth.loginViaEmailPassword(email.trim(), password);
      await finishLogin(result?.access_token);
    } catch (err) {
      setError(err?.message || 'That verification code did not work.');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email first.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await base44.auth.resetPasswordRequest(email.trim());
      setMessage('Password reset email sent.');
    } catch (err) {
      setError(err?.message || 'Could not send the reset email.');
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await base44.auth.resendOtp(email.trim());
      setMessage('A new verification code was sent.');
    } catch (err) {
      setError(err?.message || 'Could not resend the code.');
    } finally {
      setBusy(false);
    }
  };

  const googleLogin = () => {
    setError('');
    setMessage('');
    base44.auth.loginWithProvider('google', getNativeLoginReturnUrl());
  };

  const heading = mode === 'register' ? 'Create your Yardit account' : mode === 'verify' ? 'Verify your email' : 'Log in to Yardit';

  return (
    <div className="min-h-screen bg-[#F3E6CF] flex items-center justify-center px-5 py-8">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl border border-black/10 p-6">
        <img src={LOGO} alt="Yardit" className="w-44 mx-auto mb-5" />
        <h1 className="text-2xl font-bold text-[#2C4F4E] text-center">{heading}</h1>
        <p className="text-sm text-slate-500 text-center mt-2 mb-6">Native Yardit login</p>

        {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
        {message && <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{message}</div>}

        {mode !== 'verify' && (
          <form onSubmit={mode === 'register' ? register : login} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-[#5DADA5]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-[#5DADA5]"
              />
            </div>
            <button disabled={busy} className="w-full rounded-xl bg-[#2C4F4E] text-white font-bold py-3 disabled:opacity-50">
              {busy ? 'Please wait…' : mode === 'register' ? 'Create Account' : 'Log In'}
            </button>
          </form>
        )}

        {mode === 'verify' && (
          <form onSubmit={verify} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Verification code</label>
              <input
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center tracking-[0.35em] text-lg outline-none focus:ring-2 focus:ring-[#5DADA5]"
              />
            </div>
            <button disabled={busy} className="w-full rounded-xl bg-[#2C4F4E] text-white font-bold py-3 disabled:opacity-50">
              {busy ? 'Verifying…' : 'Verify & Continue'}
            </button>
            <button type="button" onClick={resendOtp} disabled={busy} className="w-full text-sm font-semibold text-[#2C4F4E]">Resend code</button>
          </form>
        )}

        {mode === 'login' && (
          <>
            <button type="button" onClick={resetPassword} disabled={busy} className="w-full mt-3 text-sm font-semibold text-[#2C4F4E]">Forgot password?</button>
            <div className="flex items-center gap-3 my-5"><div className="h-px bg-slate-200 flex-1"/><span className="text-xs text-slate-400">OR</span><div className="h-px bg-slate-200 flex-1"/></div>
            <button type="button" onClick={googleLogin} disabled={busy} className="w-full rounded-xl border border-slate-300 bg-white py-3 font-semibold text-slate-700">Continue with Google</button>
          </>
        )}

        <div className="mt-6 text-center text-sm">
          {mode === 'login' ? (
            <button onClick={() => { setMode('register'); setError(''); setMessage(''); }} className="font-semibold text-[#2C4F4E]">Create an account</button>
          ) : mode === 'register' ? (
            <button onClick={() => { setMode('login'); setError(''); setMessage(''); }} className="font-semibold text-[#2C4F4E]">Already have an account? Log in</button>
          ) : (
            <button onClick={() => { setMode('register'); setError(''); setMessage(''); }} className="font-semibold text-[#2C4F4E]">Back</button>
          )}
        </div>
      </div>
    </div>
  );
}
