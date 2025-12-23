import AddLocation from './pages/AddLocation';
import AdminLite from './pages/AdminLite';
import CreateListing from './pages/CreateListing';
import Home from './pages/Home';
import Leaderboard from './pages/Leaderboard';
import ListingDetail from './pages/ListingDetail';
import Map from './pages/Map';
import MyListings from './pages/MyListings';
import NotificationSettings from './pages/NotificationSettings';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import SellerDashboard from './pages/SellerDashboard';
import Settings from './pages/Settings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AddLocation": AddLocation,
    "AdminLite": AdminLite,
    "CreateListing": CreateListing,
    "Home": Home,
    "Leaderboard": Leaderboard,
    "ListingDetail": ListingDetail,
    "Map": Map,
    "MyListings": MyListings,
    "NotificationSettings": NotificationSettings,
    "Notifications": Notifications,
    "Profile": Profile,
    "SellerDashboard": SellerDashboard,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "Map",
    Pages: PAGES,
    Layout: __Layout,
};