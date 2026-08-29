import { recordAuthDebugEvent } from '@/lib/authDebug';

const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const YARDIT_BASE44_APP_ID = import.meta.env.VITE_BASE44_APP_ID || '690f554506edf795e5d84121';
const YARDIT_BASE44_SERVER_URL = import.meta.env.VITE_BASE44_BACKEND_URL || 'https://base44.app';

const OAUTH_TOKEN_PARAM = "access_token";
const OAUTH_CALLBACK_PARAMS = ["access_token", "id_token", "refresh_token", "token_type", "expires_in", "scope", "state", "authuser", "prompt"];
const isHostedNativeAuthHandoff = !isNode && new URLSearchParams(window.location.search).get("yardit_native_auth") === "1";

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const getStorageKey = (paramName) => `base44_${toSnakeCase(paramName)}`;

export const getStoredAccessToken = () => {
	if (isNode) return null;
	return storage.getItem(getStorageKey(OAUTH_TOKEN_PARAM));
};

const getHashParts = () => {
	const rawHash = window.location.hash ? window.location.hash.slice(1) : "";
	if (!rawHash) return { routePart: "", params: new URLSearchParams(), hasParams: false };

	const questionIndex = rawHash.indexOf("?");
	const hasRouteQuery = questionIndex >= 0;
	const looksLikeParams = rawHash.includes("=") && !rawHash.startsWith("/");
	const routePart = hasRouteQuery ? rawHash.slice(0, questionIndex) : "";
	const queryPart = hasRouteQuery ? rawHash.slice(questionIndex + 1) : looksLikeParams ? rawHash : "";

	return { routePart, params: new URLSearchParams(queryPart), hasParams: Boolean(queryPart) };
};

const getIncomingUrlParam = (paramName) => {
	const searchParam = new URLSearchParams(window.location.search).get(paramName);
	if (searchParam) return searchParam;
	return getHashParts().params.get(paramName);
};

const cleanOAuthParamsFromUrl = () => {
	const searchParams = new URLSearchParams(window.location.search);
	OAUTH_CALLBACK_PARAMS.forEach((param) => searchParams.delete(param));

	const hashParts = getHashParts();
	OAUTH_CALLBACK_PARAMS.forEach((param) => hashParts.params.delete(param));

	const nextSearch = searchParams.toString() ? `?${searchParams.toString()}` : "";
	let nextHash = "";
	if (hashParts.routePart) {
		const nextHashParams = hashParts.params.toString();
		nextHash = `#${hashParts.routePart}${nextHashParams ? `?${nextHashParams}` : ""}`;
	} else if (hashParts.hasParams && hashParts.params.toString()) {
		nextHash = `#${hashParts.params.toString()}`;
	} else if (window.location.hash && !hashParts.hasParams) {
		nextHash = window.location.hash;
	}

	const newUrl = `${window.location.pathname}${nextSearch}${nextHash}`;
	window.history.replaceState({}, document.title, newUrl);
};

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = getStorageKey(paramName);
	const incomingParam = getIncomingUrlParam(paramName);
	const storedBeforeRead = storage.getItem(storageKey);
	if (paramName === OAUTH_TOKEN_PARAM) {
		console.log("AUTH_DEBUG appParams.token:source", {
			hasAccessTokenInUrl: !!incomingParam,
			hasStoredToken: !!storedBeforeRead,
			removeFromUrl,
			readsHashFragment: true,
		});
		recordAuthDebugEvent('app_params_token_source', {
			hasAccessTokenInUrl: !!incomingParam,
			hasStoredToken: !!storedBeforeRead,
			removeFromUrl,
			readsHashFragment: true,
		});
	}
	if (removeFromUrl && incomingParam) {
		cleanOAuthParamsFromUrl();
	}
	if (incomingParam) {
		storage.setItem(storageKey, incomingParam);
		if (paramName === OAUTH_TOKEN_PARAM) {
			recordAuthDebugEvent('app_params_token_saved', {
				storedBase44AccessToken: !!storage.getItem(storageKey),
			});
		}
		return incomingParam;
	}
	if (defaultValue) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
	return null;
}

const getAppParams = () => {
	return {
		appId: getAppParamValue("app_id", { defaultValue: YARDIT_BASE44_APP_ID }),
		serverUrl: getAppParamValue("server_url", { defaultValue: YARDIT_BASE44_SERVER_URL }),
		token: getAppParamValue(OAUTH_TOKEN_PARAM, { removeFromUrl: !isHostedNativeAuthHandoff }),
		fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
		functionsVersion: getAppParamValue("functions_version"),
	}
}


export const appParams = {
	...getAppParams()
}