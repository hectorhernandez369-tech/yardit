import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { base44 } from "@/api/base44Client";
import { isComingSoonModeEnabled, getTesterBypass, shouldBypassComingSoonForCurrentUrl } from '@/lib/comingSoonMode';
import PageNotFound from './lib/PageNotFound';
import ComingSoon from './pages/ComingSoon';
import VendorDashboard from './pages/VendorDashboard';
import AssistedListingApproval from './pages/AssistedListingApproval';
import CreateListingUpgradeReturn from './pages/CreateListingUpgradeReturn';
import PrintableChecklist from './pages/PrintableChecklist';
import LaunchChecklist from './pages/LaunchChecklist';
import VendorPinPreview from './pages/VendorPinPreview';
import VendorPublicPage from './pages/VendorPublicPage';
import VendorSignup from './pages/VendorSignup';
import VendorSetup from './pages/VendorSetup';
import VendorAccountIntro from './pages/VendorAccountIntro';
import VendorEventDashboard from './pages/VendorEventDashboard';
import VendorEventFlags from './pages/VendorEventFlags';
import VendorEventSchedule from './pages/VendorEventSchedule';
import VendorEventDetail from './pages/VendorEventDetail';
import AccountOptions from './pages/AccountOptions';
import Events from './pages/Events';
import RewardRedeem from './pages/RewardRedeem';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isGuest } = useAuth();

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

  const isComingSoonMode = isComingSoonModeEnabled(appSettings) && !getTesterBypass() && !shouldBypassComingSoonForCurrentUrl();
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
        <Route path="/VendorDashboard" element={<LayoutWrapper currentPageName="VendorDashboard"><VendorDashboard /></LayoutWrapper>} />
        <Route path="/VendorSignup" element={<LayoutWrapper currentPageName="VendorSignup"><VendorSignup /></LayoutWrapper>} />
        <Route path="/VendorSetup" element={<LayoutWrapper currentPageName="VendorSetup"><VendorSetup /></LayoutWrapper>} />
        <Route path="/VendorAccountIntro" element={<LayoutWrapper currentPageName="VendorAccountIntro"><VendorAccountIntro /></LayoutWrapper>} />
        <Route path="/VendorEventDashboard" element={<LayoutWrapper currentPageName="VendorEventDashboard"><VendorEventDashboard /></LayoutWrapper>} />
        <Route path="/VendorEventFlags" element={<LayoutWrapper currentPageName="VendorEventFlags"><VendorEventFlags /></LayoutWrapper>} />
        <Route path="/VendorEventSchedule" element={<LayoutWrapper currentPageName="VendorEventSchedule"><VendorEventSchedule /></LayoutWrapper>} />
        <Route path="/VendorEventPublicPage" element={<LayoutWrapper currentPageName="VendorEventPublicPage"><VendorEventDetail /></LayoutWrapper>} />
        <Route path="/VendorEventDetail" element={<LayoutWrapper currentPageName="VendorEventDetail"><VendorEventDetail /></LayoutWrapper>} />
        <Route path="/AccountOptions" element={<LayoutWrapper currentPageName="AccountOptions"><AccountOptions /></LayoutWrapper>} />
        <Route path="/VendorPinPreview" element={<LayoutWrapper currentPageName="VendorPinPreview"><VendorPinPreview /></LayoutWrapper>} />
        <Route path="/VendorPublicPage" element={<LayoutWrapper currentPageName="VendorPublicPage"><VendorPublicPage /></LayoutWrapper>} />
        <Route path="/vendor/:vendorSlug" element={<LayoutWrapper currentPageName="VendorPublicPage"><VendorPublicPage /></LayoutWrapper>} />
        <Route path="/CreateListingUpgradeReturn" element={<LayoutWrapper currentPageName="CreateListingUpgradeReturn"><CreateListingUpgradeReturn /></LayoutWrapper>} />
        <Route path="/PrintableChecklist" element={<PrintableChecklist />} />
        <Route path="/LaunchChecklist" element={<LayoutWrapper currentPageName="LaunchChecklist"><LaunchChecklist /></LayoutWrapper>} />
        <Route path="/ComingSoon" element={<ComingSoon />} />
        <Route path="/assisted-listing" element={<AssistedListingApproval />} />
        <Route path="/events" element={<Events />} />
        <Route path="/reward/redeem/:token" element={<RewardRedeem />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
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