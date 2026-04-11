export function createPageUrl(pageName: string) {
    return '/' + pageName.toLowerCase().replace(/ /g, '-');
}

const CURRENT_ROUTE_KEY = '__yardit_current_route';
const PREVIOUS_ROUTE_KEY = '__yardit_previous_route';

export function getCurrentAppRoute() {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function getPreviousAppRoute() {
    return sessionStorage.getItem(PREVIOUS_ROUTE_KEY) || '';
}

export function rememberAppRoute(route: string) {
    const currentRoute = sessionStorage.getItem(CURRENT_ROUTE_KEY);
    if (currentRoute && currentRoute !== route) {
        sessionStorage.setItem(PREVIOUS_ROUTE_KEY, currentRoute);
    }
    sessionStorage.setItem(CURRENT_ROUTE_KEY, route);
}

export function getSafeBackTarget(fallbackRoute: string, explicitRoute?: string | null) {
    const currentRoute = getCurrentAppRoute();
    const explicit = explicitRoute || '';
    if (explicit && explicit !== currentRoute) return explicit;

    const previousRoute = getPreviousAppRoute();
    if (previousRoute && previousRoute !== currentRoute) return previousRoute;

    return fallbackRoute;
}

export function safeBack(navigate: (to: string | number) => void, fallbackRoute: string, explicitRoute?: string | null) {
    if (typeof window !== 'undefined' && window.history.length > 1) {
        navigate(-1);
        return;
    }

    navigate(getSafeBackTarget(fallbackRoute, explicitRoute));
}