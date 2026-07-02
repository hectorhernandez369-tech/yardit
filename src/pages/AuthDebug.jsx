import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { clearAuthDebugEvents, getAuthDebugEvents, recordAuthDebugEvent } from '@/lib/authDebug';
import { getStoredAccessToken } from '@/lib/app-params';

export default function AuthDebug() {
  const [events, setEvents] = useState([]);
  const [authStatus, setAuthStatus] = useState('Not checked');

  const refresh = () => {
    setEvents(getAuthDebugEvents().slice().reverse());
  };

  useEffect(() => {
    recordAuthDebugEvent('auth_debug_page_opened', {
      storedBase44AccessToken: Boolean(getStoredAccessToken()),
      currentUrl: window.location.href,
    });
    refresh();
  }, []);

  const summary = useMemo(() => ({
    callbackOpened: events.some((event) => event.path === '/auth-callback' || event.type === 'auth_callback_route_seen'),
    tokenSeen: events.some((event) => event.details?.hasAccessTokenInUrl === true),
    tokenSaved: events.some((event) => event.details?.storedBase44AccessToken === true),
    authSucceeded: events.some((event) => event.type === 'base44_auth_me_success'),
    authFailed: events.some((event) => event.type === 'base44_auth_me_error'),
  }), [events]);

  const checkAuth = async () => {
    setAuthStatus('Checking...');
    try {
      const user = await base44.auth.me();
      recordAuthDebugEvent('manual_auth_check_success', { userId: user?.id, email: user?.email });
      setAuthStatus(`Signed in as ${user?.email || user?.full_name || 'current user'}`);
    } catch (error) {
      recordAuthDebugEvent('manual_auth_check_error', { status: error?.status, message: error?.message });
      setAuthStatus(`Failed: ${error?.message || 'Not authenticated'}`);
    }
    refresh();
  };

  const clearLogs = () => {
    clearAuthDebugEvents();
    setEvents([]);
    setAuthStatus('Logs cleared');
  };

  return (
    <div className="min-h-screen bg-[#F3E6CF] p-4 text-[#2C4F4E]">
      <div className="mx-auto max-w-4xl space-y-4">
        <Card className="border-2 border-[#2C4F4E] bg-white/90">
          <CardHeader>
            <CardTitle>Yardit Auth Diagnostics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-700">
              Open this page inside the Play-installed app after trying Google sign-in to see whether the login callback, token capture, token save, and Base44 session check happened.
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
              <Status label="Callback opened" value={summary.callbackOpened} />
              <Status label="Token seen" value={summary.tokenSeen} />
              <Status label="Token saved" value={summary.tokenSaved} />
              <Status label="Auth success" value={summary.authSucceeded} />
              <Status label="Auth failed" value={summary.authFailed} warning />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={checkAuth} className="bg-[#5DADA5] text-white hover:bg-[#4A9B93]">Check current session</Button>
              <Button onClick={refresh} variant="outline">Refresh logs</Button>
              <Button onClick={clearLogs} variant="outline">Clear logs</Button>
            </div>
            <p className="text-sm font-semibold">{authStatus}</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-[#2C4F4E] bg-white/90">
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-sm text-gray-600">No auth diagnostic events recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="rounded-lg border bg-gray-50 p-3 text-xs">
                    <div className="mb-1 flex flex-wrap items-center gap-2 font-semibold">
                      <span>{event.type}</span>
                      <span className="text-gray-500">{new Date(event.at).toLocaleString()}</span>
                    </div>
                    <div className="text-gray-700">Path: {event.path || '/'}</div>
                    <div className="text-gray-700">Search: {String(event.hasSearch)} · Hash: {String(event.hasHash)}</div>
                    {event.referrer && <div className="break-all text-gray-700">Referrer: {event.referrer}</div>}
                    <pre className="mt-2 max-h-44 overflow-auto rounded bg-white p-2 text-[11px] text-gray-800">{JSON.stringify(event.details || {}, null, 2)}</pre>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Status({ label, value, warning = false }) {
  const activeClass = warning ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
  return (
    <div className={`rounded-lg px-3 py-2 font-semibold ${value ? activeClass : 'bg-gray-100 text-gray-600'}`}>
      <div>{label}</div>
      <div>{value ? 'Yes' : 'No'}</div>
    </div>
  );
}