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
import PaymentAudit from './pages/PaymentAudit';
import AuthDebug from './pages/AuthDebug';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CommunityGuidelines from './pages/CommunityGuidelines';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import YarditSplashScreen from '@/components/install/YarditSplashScreen';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isGuest, isAuthenticated } = useAuth();

  const { data: publicAppSettings = [], isLoading: isLoadingAppSettings } = useQuery({
    queryKey: ["publicAppSettings"],
    queryFn: async () => {
      const response = await base44.functions.invoke("getPublicAppSettings", {});
      return response?.data?.settings || [];
    },
    initialData: [],
    enabled: !isAuthenticated,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <YarditSplashScreen />
    );
  }

  // Handle authentication errors
  if (authError && !isGuest && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  const isComingSoonMode = isComingSoonModeEnabled(publicAppSettings) && !isAuthenticated && !getTesterBypass() && !shouldBypassComingSoonForCurrentUrl();
  const AdminPage = Pages.AdminLite;

  if (isLoadingAppSettings) {
    return (
      <YarditSplashScreen />
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
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/community-guidelines" element={<CommunityGuidelines />} />
          <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
          <Route path="/TermsOfService" element={<TermsOfService />} />
          <Route path="/CommunityGuidelines" element={<CommunityGuidelines />} />
          <Route path="/ComingSoon" element={<ComingSoon />} />
          <Route path="/auth-callback" element={<YarditSplashScreen />} />
          <Route path="/auth-debug" element={<AuthDebug />} />
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
        <Route path="/auth-callback" element={<YarditSplashScreen />} />
        <Route path="/auth-debug" element={<AuthDebug />} />
        <Route path="/assisted-listing" element={<AssistedListingApproval />} />
        <Route path="/events" element={<Events />} />
        <Route path="/PaymentAudit" element={<LayoutWrapper currentPageName="PaymentAudit"><PaymentAudit /></LayoutWrapper>} />
        <Route path="/privacy" element={<LayoutWrapper currentPageName="PrivacyPolicy"><PrivacyPolicy /></LayoutWrapper>} />
        <Route path="/terms" element={<LayoutWrapper currentPageName="TermsOfService"><TermsOfService /></LayoutWrapper>} />
        <Route path="/community-guidelines" element={<LayoutWrapper currentPageName="CommunityGuidelines"><CommunityGuidelines /></LayoutWrapper>} />
        <Route path="/PrivacyPolicy" element={<LayoutWrapper currentPageName="PrivacyPolicy"><PrivacyPolicy /></LayoutWrapper>} />
        <Route path="/TermsOfService" element={<LayoutWrapper currentPageName="TermsOfService"><TermsOfService /></LayoutWrapper>} />
        <Route path="/CommunityGuidelines" element={<LayoutWrapper currentPageName="CommunityGuidelines"><CommunityGuidelines /></LayoutWrapper>} />
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