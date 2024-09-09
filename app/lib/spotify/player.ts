import { useEffect, useState, useContext, createContext } from "react";

import type { SpotifyAuthToken } from "./auth";
import { getFakePlayer } from "./fakePlayer";

declare global {
	interface Window {
		player?: WrappedPlayer;
	}
}

const SPOTIFY_SCRIPT_ID = "spotify-sdk-script";

export enum PlayerStatus {
	LOADING = "loading",
	NOT_CONNECTED = "deviceNotConnected",
	INIT_ERROR = "initializationError",
	AUTH_ERROR = "authError",
	ACCT_ERROR = "accountError",
	PLAYBACK_ERROR = "playbackError",
	READY = "ready",
}

type PlayerEvent = Parameters<Spotify.Player["removeListener"]>[0];

const playerEvents: PlayerEvent[] = [
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: no functions/data refs change between renders
	useEffect(() => {
		// Use the player from the Window if it has a correct token
		if (window.player && window.player.authToken.value === token) {
			const promise = Promise.resolve(window.player);
			tokenAndPromise = { token, promise };
		} else if (
			!tokenAndPromise ||
			token !== tokenAndPromise.token ||
			!tokenAndPromise.promise
		) {
			// In this case the window.player would have a differnet token.
			window.player?.disconnect();
			const promise =
				token === "fake"
					? Promise.resolve(createWrappedPlayer(getFakePlayer()))
					: getSpotifyPlayer(token);
			tokenAndPromise = { token, promise };
		}

		tokenAndPromise.promise?.then(async (wp) => {
			if (!(await wp.connect())) {
				setStatus(PlayerStatus.INIT_ERROR);
				return;
			}
			wp.getCurrentState().then(setStatusFromState);

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
				window.player?.removeListener(event as PlayerEvent);
		};
	}, [token]);

	return { player, status };
};

const getSpotifyPlayer = async (token: string): Promise<WrappedPlayer> => {
	if (!document.getElementById(SPOTIFY_SCRIPT_ID)) {
		const $script = document.createElement("script");
		$script.id = SPOTIFY_SCRIPT_ID;
		$script.src = "https://sdk.scdn.co/spotify-player.js";
		document.body.appendChild($script);
	}

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

export type OnTickCallback = (ms: number) => void;
export type WrappedPlayer = Spotify.Player & {
	authToken: SpotifyAuthToken;
	seekTo: (ms: number) => void;
	addOnStateChange: (cb: Spotify.PlaybackStateListener) => void;
	removeOnStateChange: (cb: Spotify.PlaybackStateListener) => void;
	addOnTick: (cb: OnTickCallback) => void;
	removeOnTick: (cb: OnTickCallback) => void;
};

const createWrappedPlayer = (player: Spotify.Player): WrappedPlayer => {
	let tickIntervalId: number | undefined;
	const playerStateCallbacks: Spotify.PlaybackStateListener[] = [];
	const onTickCallbacks: OnTickCallback[] = [];

	const tick = async (ms?: number) => {
		const timeMs =
			ms !== undefined ? ms : (await player.getCurrentState())?.position;
		if (timeMs !== undefined) for (const cb of onTickCallbacks) cb(timeMs);
	};

	const stateChangeCallback = (state: Spotify.PlaybackState | null) => {
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

	player.addListener("player_state_changed", stateChangeCallback);

	const additionalProperties = {
		authToken: { value: undefined, reset: () => {} },
		seekTo(timeMs: number) {
			const posTimeMs = timeMs < 0 ? 0 : timeMs;
			player.seek(posTimeMs).then(() => tick(posTimeMs));
		},
		addOnStateChange(cb: Spotify.PlaybackStateListener) {
			player.getCurrentState().then((state) => state && cb(state));
			playerStateCallbacks.push(cb);
		},
		removeOnStateChange(callback: Spotify.PlaybackStateListener) {
			if (!playerStateCallbacks.length) return;
			const index = playerStateCallbacks.findIndex((cb) => cb === callback);
			if (index > -1) playerStateCallbacks.splice(index, 1);
		},
		addOnTick(cb: OnTickCallback) {
			player.getCurrentState().then((state) => state && cb(state.position));
			onTickCallbacks.push(cb);
		},
		removeOnTick(callback: OnTickCallback) {
			if (!onTickCallbacks.length) return;
			const index = onTickCallbacks.findIndex((cb) => cb === callback);
			if (index > -1) onTickCallbacks.splice(index, 1);
		},
	};

	return Object.assign(player, additionalProperties);
};

export const PlayerContext = createContext({} as WrappedPlayer);
export const usePlayer = () => useContext(PlayerContext);
