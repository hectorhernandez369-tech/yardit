import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import HomePage from '@/pages/Home';

export default function MapboxTest() {
  const { user, isLoadingAuth, navigateToLogin } = useAuth();
  const navigate = useNavigate();
  if (isLoadingAuth) return <div className="min-h-[70vh] grid place-items-center"><Loader2 aria-label="Loading" className="animate-spin" /></div>;
  if (user?.id && user.email?.trim().toLowerCase() === 'hectorhernandez369@gmail.com') return <HomePage mapboxPreview />;
  return <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
    <ShieldAlert className="h-8 w-8 text-muted-foreground" />
    <h1 className="font-bold text-lg">{user?.id ? 'Developer Mapbox Test' : 'Sign in to open the Mapbox test'}</h1>
    <p className="text-sm text-muted-foreground">{user?.id ? 'This map is restricted to the Yardit developer account.' : 'Sign in with your Yardit account to continue.'}</p>
    {!user?.id && <Button onClick={() => navigateToLogin(window.location.href)}>Sign In</Button>}
    <Button variant="outline" onClick={() => navigate('/')}>Return to Yardit</Button>
  </div>;
}