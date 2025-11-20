import Map from './pages/Map';
import AddLocation from './pages/AddLocation';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import NotificationSettings from './pages/NotificationSettings';
import SellerDashboard from './pages/SellerDashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Map": Map,
    "AddLocation": AddLocation,
    "Profile": Profile,
    "Notifications": Notifications,
    "NotificationSettings": NotificationSettings,
    "SellerDashboard": SellerDashboard,
}

export const pagesConfig = {
    mainPage: "Map",
    Pages: PAGES,
    Layout: __Layout,
};