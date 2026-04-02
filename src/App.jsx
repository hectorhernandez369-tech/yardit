import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { base44 } from "@/api/base44Client";
import { isComingSoonModeEnabled, getTesterBypass } from '@/lib/comingSoonMode';
import PageNotFound from './lib/PageNotFound';
import ComingSoon from './pages/ComingSoon';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import GuestEntryModal from '@/components/guest/GuestEntryModal';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, isGuest, enterGuestMode, isAuthenticated } = useAuth();
  const showGuestEntry = !isLoadingAuth && !isLoadingPublicSettings && !isAuthenticated && !isGuest && (!authError || authError.type === 'auth_required');

  const { data: appSettings = [], isLoading: isLoadingAppSettings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => base44.entities.AppSetting.list(),
    initialData: [],
  });

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError && !isGuest && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  const isComingSoonMode = isComingSoonModeEnabled(appSettings) && !getTesterBypass();
  const AdminPage = Pages.AdminLite;

  if (isLoadingAppSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isComingSoonMode) {
    return (
      <>
        <Routes>
          {AdminPage && (
            <Route
              path="/AdminLite"
              element={
                <LayoutWrapper currentPageName="AdminLite">
                  <AdminPage />
                </LayoutWrapper>
              }
            />
          )}
          <Route path="/ComingSoon" element={<ComingSoon />} />
          <Route path="*" element={<Navigate to="/ComingSoon" replace />} />
        </Routes>
        <GuestEntryModal open={showGuestEntry} onLogin={navigateToLogin} onGuestEnter={enterGuestMode} />
      </>
    );
  }

  // Render the main app
  return (
    <>
      <Routes>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="/ComingSoon" element={<ComingSoon />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
      <GuestEntryModal open={showGuestEntry} onLogin={navigateToLogin} onGuestEnter={enterGuestMode} />
    </>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App