import Map from './pages/Map';
import AddLocation from './pages/AddLocation';
import Layout from './Layout.jsx';


export const PAGES = {
    "Map": Map,
    "AddLocation": AddLocation,
}

export const pagesConfig = {
    mainPage: "Map",
    Pages: PAGES,
    Layout: Layout,
};