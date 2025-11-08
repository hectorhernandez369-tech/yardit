import Map from './pages/Map';
import AddLocation from './pages/AddLocation';
import Profile from './pages/Profile';
import Layout from './Layout.jsx';


export const PAGES = {
    "Map": Map,
    "AddLocation": AddLocation,
    "Profile": Profile,
}

export const pagesConfig = {
    mainPage: "Map",
    Pages: PAGES,
    Layout: Layout,
};