/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminLite from './pages/AdminLite';
import CaseManagement from './pages/CaseManagement';
import CreateListing from './pages/CreateListing';
import Home from './pages/Home';
import JoinNeighborhoodSale from './pages/JoinNeighborhoodSale';
import Leaderboard from './pages/Leaderboard';
import ListingDetail from './pages/ListingDetail';
import MyHunt from './pages/MyHunt';
import MyListings from './pages/MyListings';
import NotificationSettings from './pages/NotificationSettings';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import SellerDashboard from './pages/SellerDashboard';
import Settings from './pages/Settings';
import joinNeighborhoodSale from './pages/join-neighborhood-sale';
import FAQ from './pages/FAQ';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminLite": AdminLite,
    "CaseManagement": CaseManagement,
    "CreateListing": CreateListing,
    "Home": Home,
    "JoinNeighborhoodSale": JoinNeighborhoodSale,
    "Leaderboard": Leaderboard,
    "ListingDetail": ListingDetail,
    "MyHunt": MyHunt,
    "MyListings": MyListings,
    "NotificationSettings": NotificationSettings,
    "Notifications": Notifications,
    "Profile": Profile,
    "SellerDashboard": SellerDashboard,
    "Settings": Settings,
    "join-neighborhood-sale": joinNeighborhoodSale,
    "FAQ": FAQ,
}

export const pagesConfig = {
    mainPage: "AdminLite",
    Pages: PAGES,
    Layout: __Layout,
};