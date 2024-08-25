import { useEffect, useState, useContext, createContext } from "react";
import { useLocation } from "@remix-run/react";

declare global {
	interface Window {
		player?: WrappedPlayer;
	}
}

export enum AuthStatus {
	LOADING = "loading",
	NO_AUTH = "noAuth",
	GOOD = "good",
}

export const useSpotifyAuth = () => {
	// Can't just grab the token from localStorage bc it's only available
	// on the browser. Remix also renders this component on the server >:[
	const [token, setToken] = useState<string>();
	const [status, setStatus] = useState(AuthStatus.LOADING);
	const location = useLocation();
	const tokenInParams = new URLSearchParams(location.search).get("token");

	useEffect(() => {
		if (token) return;

		// Use token from url search before LS bc LS token might be stale
		if (tokenInParams) {
			setToken(tokenInParams);
			setStatus(AuthStatus.GOOD);
			localStorage.setItem("authToken", tokenInParams);

			// Even if the search string manimpulation here is removed, the app still
			// mounts/unmounts/mounts the root component ¯\_(ツ)_/¯
			const newUrl = new URL(window.location.href);
			newUrl.searchParams.delete("token");
			window.history.replaceState(null, "", newUrl);
			return;
		}

		const tokenFromLS = localStorage.getItem("authToken");
		if (tokenFromLS) {
			setToken(tokenFromLS);
			setStatus(AuthStatus.GOOD);
			return;
		}

		setStatus(AuthStatus.NO_AUTH);
	}, [tokenInParams]);

	const reset = () => {
		setToken(undefined);
		setStatus(AuthStatus.NO_AUTH);
	};

	return { status, token: { value: token, reset } };
};

export type SpotifyAuthToken = ReturnType<typeof useSpotifyAuth>["token"];

const getSpotifyPlayer = async (token: string): Promise<Spotify.Player> => {
	const $script = document.createElement("script");
	$script.src = "https://sdk.scdn.co/spotify-player.js";
	document.body.appendChild($script);

	return new Promise((resolve) => {
		window.onSpotifyWebPlaybackSDKReady = () => {
			resolve(
				new Spotify.Player({
					name: "Choreo Player",
					getOAuthToken: (cb) => cb(token),
					volume: 0.5,
				}),
			);
		};
	});
};

export enum PlayerStatus {
	LOADING = "loading",
	NOT_CONNECTED = "deviceNotConnected",
	INIT_ERROR = "initializationError",
	AUTH_ERROR = "authError",
	ACCT_ERROR = "accountError",
	PLAYBACK_ERROR = "playbackError",
	READY = "ready",
}

const playerEvents: Parameters<Spotify.Player["removeListener"]>[0][] = [
	"player_state_changed",
	"playback_error",
	"initialization_error",
	"authentication_error",
	"account_error",
	"ready",
];

// This variable is needed because the root component gets mounted/unmounted
// which can cause multiple player instances to get initialized if the data is
// only stored in React state.
let tokenAndPromise: { token: string; promise: Promise<Spotify.Player> };
export const useSpotifyPlayer = (authToken: SpotifyAuthToken) => {
	const token = authToken.value as string;
	const [player, setPlayer] = useState<WrappedPlayer>();
	const [status, setStatus] = useState<PlayerStatus>(PlayerStatus.LOADING);

	const setStatusFromState = (state: Spotify.PlaybackState | null) => {
		setStatus(state ? PlayerStatus.READY : PlayerStatus.NOT_CONNECTED);
	};

	useEffect(() => {
		let promise: Promise<Spotify.Player>;
		if (
			tokenAndPromise &&
			token === tokenAndPromise.token &&
			tokenAndPromise.promise
		) {
			promise = tokenAndPromise.promise;
		} else {
			promise = getSpotifyPlayer(token);
			tokenAndPromise = { token, promise };
		}

		promise.then(async (p) => {
			window.player?.disconnect();
			if (!(await p.connect())) {
				setStatus(PlayerStatus.INIT_ERROR);
				return;
			}

			p.addListener("player_state_changed", setStatusFromState);
			p.addListener("playback_error", (obj) => {
				console.log(`playback error ${JSON.stringify(obj)}`);
				setStatus(PlayerStatus.PLAYBACK_ERROR);
			});
			p.addListener("initialization_error", () =>
				setStatus(PlayerStatus.INIT_ERROR),
			);
			p.addListener("authentication_error", () =>
				setStatus(PlayerStatus.AUTH_ERROR),
			);
			p.addListener("account_error", () => setStatus(PlayerStatus.ACCT_ERROR));
			p.addListener("ready", () => setStatus(PlayerStatus.NOT_CONNECTED));

			const wrappedPlayer = createWrappedPlayer(p, authToken);
			window.player = wrappedPlayer;
			setPlayer(wrappedPlayer);
		});
	}, [token]);

	return { player, status };
};

export type PlayerStateCallback = (state: Spotify.PlaybackState) => void;
type CallbackHandler = (cb: PlayerStateCallback) => void;

const playerStateCallbacks: PlayerStateCallback[] = [];
const onTickCallbacks: PlayerStateCallback[] = [];

let intervalId: number;

export type WrappedPlayer = Spotify.Player & {
	authToken: SpotifyAuthToken;
	seekTo: (ms: number) => void;
	addOnStateChange: CallbackHandler;
	removeOnStateChange: CallbackHandler;
	addOnTick: CallbackHandler;
	removeOnTick: CallbackHandler;
};

const createWrappedPlayer = (
	player: Spotify.Player,
	authToken: SpotifyAuthToken,
): WrappedPlayer => {
	const tick = () =>
		player.getCurrentState().then((state) => {
			if (state) for (const cb of onTickCallbacks) cb(state);
		});

	const mainCallback = (state: Spotify.PlaybackState | null) => {
		if (!state) return;
		if (!state.paused) {
			intervalId = window.setInterval(tick, 100);
		} else {
			clearInterval(intervalId);
		}
		for (const cb of playerStateCallbacks) cb(state);
	};
	player.addListener("player_state_changed", mainCallback);

	const additionalProperties = {
		authToken,
		seekTo(ms: number) {
			player.seek(ms).then(tick);
		},
		addOnStateChange(cb: PlayerStateCallback) {
			player.getCurrentState().then((state) => state && cb(state));
			playerStateCallbacks.push(cb);
		},
		removeOnStateChange(callback: PlayerStateCallback) {
			if (!playerStateCallbacks.length) return;
			const index = playerStateCallbacks.findIndex((cb) => cb === callback);
			if (index > -1) playerStateCallbacks.splice(index, 1);
		},
		addOnTick(cb: PlayerStateCallback) {
			onTickCallbacks.push(cb);
		},
		removeOnTick(callback: PlayerStateCallback) {
			if (!onTickCallbacks.length) return;
			const index = onTickCallbacks.findIndex((cb) => cb === callback);
			if (index > -1) onTickCallbacks.splice(index, 1);
		},
	};

	return Object.assign(player, additionalProperties);
};

export const PlayerContext = createContext({} as WrappedPlayer);
export const usePlayer = () => useContext(PlayerContext);
