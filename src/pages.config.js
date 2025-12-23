import AddLocation from './pages/AddLocation';
import Home from './pages/Home';
import Leaderboard from './pages/Leaderboard';
import Map from './pages/Map';
import NotificationSettings from './pages/NotificationSettings';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import SellerDashboard from './pages/SellerDashboard';
import CreateListing from './pages/CreateListing';
import ListingDetail from './pages/ListingDetail';
import MyListings from './pages/MyListings';
import Settings from './pages/Settings';
import AdminLite from './pages/AdminLite';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AddLocation": AddLocation,
    "Home": Home,
    "Leaderboard": Leaderboard,
    "Map": Map,
    "NotificationSettings": NotificationSettings,
    "Notifications": Notifications,
    "Profile": Profile,
    "SellerDashboard": SellerDashboard,
    "CreateListing": CreateListing,
    "ListingDetail": ListingDetail,
    "MyListings": MyListings,
    "Settings": Settings,
    "AdminLite": AdminLite,
}

export const pagesConfig = {
    mainPage: "Map",
    Pages: PAGES,
    Layout: __Layout,
};