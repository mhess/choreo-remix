import { useState, useEffect } from "react";
import { useLocation } from "@remix-run/react";

export enum AuthStatus {
	LOADING = "loading",
	NO_AUTH = "noAuth",
	GOOD = "good",
}

const DEV_FAKE_PLAYER = true;

const LS_TOKEN_KEY = "authToken";

export const useSpotifyAuth = () => {
	// Can't just grab the token from localStorage bc it's only available
	// on the browser. Remix also renders this component on the server >:[
	const [token, setToken] = useState<string>();
	const [status, setStatus] = useState(AuthStatus.LOADING);
	const location = useLocation();
	const tokenInParams = DEV_FAKE_PLAYER
		? "fake"
		: new URLSearchParams(location.search).get("token");

	// biome-ignore lint/correctness/useExhaustiveDependencies: tokenInParams is only real dep
	useEffect(() => {
		if (token) return;

		// Use token from url search before LS bc LS token might be stale
		if (tokenInParams) {
			setToken(tokenInParams);
			setStatus(AuthStatus.GOOD);
			localStorage.setItem(LS_TOKEN_KEY, tokenInParams);

			// Even if the search string manimpulation here is removed, the app still
			// mounts/unmounts/mounts the root component ¯\_(ツ)_/¯
			const newUrl = new URL(window.location.href);
			newUrl.searchParams.delete("token");
			window.history.replaceState(null, "", newUrl);
			return;
		}

		const tokenFromLS = localStorage.getItem(LS_TOKEN_KEY);
		if (tokenFromLS) {
			setToken(tokenFromLS);
			setStatus(AuthStatus.GOOD);
			return;
		}

		setStatus(AuthStatus.NO_AUTH);
	}, [tokenInParams]);

	const reset = () => {
		setToken(undefined);
		localStorage.removeItem(LS_TOKEN_KEY);
		setStatus(AuthStatus.NO_AUTH);
	};

	return { status, token: { value: token, reset } };
};

export type SpotifyAuthToken = ReturnType<typeof useSpotifyAuth>["token"];
