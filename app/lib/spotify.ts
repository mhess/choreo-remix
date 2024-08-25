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

const getSpotifyPlayer = async (token: string): Promise<WrappedPlayer> => {
	const $script = document.createElement("script");
	$script.src = "https://sdk.scdn.co/spotify-player.js";
	document.body.appendChild($script);

	return new Promise((resolve) => {
		window.onSpotifyWebPlaybackSDKReady = () => {
			const spotifyPlayer = new Spotify.Player({
				name: "Choreo Player",
				getOAuthToken: (cb) => cb(token),
				volume: 0.5,
			});
			resolve(createWrappedPlayer(spotifyPlayer));
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
let tokenAndPromise: {
	token: string;
	promise: Promise<WrappedPlayer> | undefined;
};
export const useSpotifyPlayer = (authToken: SpotifyAuthToken) => {
	const token = authToken.value as string;
	const [player, setPlayer] = useState<WrappedPlayer>();
	const [status, setStatus] = useState<PlayerStatus>(PlayerStatus.LOADING);

	const setStatusFromState = (state: Spotify.PlaybackState | null) => {
		setStatus(state ? PlayerStatus.READY : PlayerStatus.NOT_CONNECTED);
	};

	useEffect(() => {
		let promise: Promise<WrappedPlayer>;
		if (
			!tokenAndPromise ||
			token !== tokenAndPromise.token ||
			!tokenAndPromise.promise
		) {
			// In this case the window.player would have a differnet token.
			window.player?.disconnect();
			promise = getSpotifyPlayer(token);
			tokenAndPromise = { token, promise };
		}

		tokenAndPromise.promise?.then(async (wp) => {
			if (!(await wp.connect())) {
				setStatus(PlayerStatus.INIT_ERROR);
				return;
			}

			wp.addListener("player_state_changed", setStatusFromState);
			wp.addListener("playback_error", (obj) => {
				console.log(`playback error ${JSON.stringify(obj)}`);
				setStatus(PlayerStatus.PLAYBACK_ERROR);
			});
			wp.addListener("initialization_error", () =>
				setStatus(PlayerStatus.INIT_ERROR),
			);
			wp.addListener("authentication_error", () =>
				setStatus(PlayerStatus.AUTH_ERROR),
			);
			wp.addListener("account_error", () => setStatus(PlayerStatus.ACCT_ERROR));
			wp.addListener("ready", () => setStatus(PlayerStatus.NOT_CONNECTED));

			wp.authToken = authToken;
			window.player = wp;
			setPlayer(wp);
		});

		return () => {
			for (const event in playerEvents)
				player?.removeListener(
					event as Parameters<typeof player.removeListener>[0],
				);
		};
	}, [token]);

	return { player, status };
};

export type PlayerStateCallback = (state: Spotify.PlaybackState) => void;
type CallbackHandler = (cb: PlayerStateCallback) => void;

const playerStateCallbacks: PlayerStateCallback[] = [];
const onTickCallbacks: ((ps: Spotify.PlaybackState, ms?: number) => void)[] =
	[];

let tickIntervalId: number | undefined;

export type WrappedPlayer = Spotify.Player & {
	authToken: SpotifyAuthToken;
	seekTo: (ms: number) => void;
	addOnStateChange: CallbackHandler;
	removeOnStateChange: CallbackHandler;
	addOnTick: CallbackHandler;
	removeOnTick: CallbackHandler;
};

const createWrappedPlayer = (player: Spotify.Player): WrappedPlayer => {
	const tick = () => {
		player.getCurrentState().then((state) => {
			if (state) for (const cb of onTickCallbacks) cb(state);
		});
	};

	const mainCallback = (state: Spotify.PlaybackState | null) => {
		if (!state) return;
		if (!state.paused) {
			if (tickIntervalId === undefined) {
				tickIntervalId = window.setInterval(tick, 100);
			}
		} else if (tickIntervalId !== undefined) {
			window.clearInterval(tickIntervalId);
			tickIntervalId = undefined;
		}
		for (const cb of playerStateCallbacks) cb(state);
	};

	player.addListener("player_state_changed", mainCallback);

	const additionalProperties = {
		authToken: { value: undefined, reset: () => {} },
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
