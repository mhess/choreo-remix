import { useEffect, useContext, createContext } from "react";
import { atom, useAtom } from "jotai";

import { getFakePlayer } from "./fakePlayer";
import { getPlaybackListenerForTick } from "../player";
import type { PlaybackListener, OnTickCallback, Player } from "../player";

declare global {
	interface Window {
		spotifyPlayer?: SpotifyPlayer;
	}
}

const SPOTIFY_SCRIPT_ID = "spotify-sdk-script";

export enum SpotifyPlayerStatus {
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

export const spotifyPlayerAtom = atom<SpotifyPlayer>();

const playerStatusAtom = atom(SpotifyPlayerStatus.LOADING);

const playbackStateAtom = atom<Spotify.PlaybackState | null>(null);

export const spotifyPausedAtom = atom((get) => {
	const state = get(playbackStateAtom);
	return state ? state.paused : true;
});

const currenTrackAtom = atom(
	(get) => get(playbackStateAtom)?.track_window.current_track,
);

export const spotifyArtistAtom = atom((get) => {
	const track = get(currenTrackAtom);
	if (!track) return "";

	return track.artists.map(({ name }) => name).join(", ");
});

export const spotifyTrackNameAtom = atom((get) => {
	const track = get(currenTrackAtom);
	return track ? track.name : "";
});

// This variable is needed because the root component gets mounted/unmounted
// which can cause multiple player instances to get initialized if the data is
// only stored in React state.
let tokenAndPromise: {
	token: string;
	promise: Promise<SpotifyPlayer> | undefined;
};

export const useSpotifyPlayer = (token: string | null) => {
	const [player, setPlayer] = useAtom(spotifyPlayerAtom);
	const [status, setStatus] = useAtom(playerStatusAtom);
	const [, setState] = useAtom(playbackStateAtom);

	useEffect(() => {
		if (!token) return;

		// Use the player from the Window if it has a correct token
		if (window.spotifyPlayer && window.spotifyPlayer.authToken === token) {
			const promise = Promise.resolve(window.spotifyPlayer);
			tokenAndPromise = { token, promise };
		} else if (
			!tokenAndPromise ||
			token !== tokenAndPromise.token ||
			!tokenAndPromise.promise
		) {
			// In this case the window.spotifyPlayer would have a differnet token.
			window.spotifyPlayer?.disconnect();
			const promise =
				token === "fake"
					? Promise.resolve(wrapSpotifyPlayer(getFakePlayer(), token))
					: getSpotifyPlayer(token);
			tokenAndPromise = { token, promise };
		}

		const onPlayerStateChanged = (state: Spotify.PlaybackState | null) => {
			setState(state);
			if (state) setPlayer(window.spotifyPlayer);
			setStatus(
				state ? SpotifyPlayerStatus.READY : SpotifyPlayerStatus.NOT_CONNECTED,
			);
		};

		tokenAndPromise.promise?.then(async (wp) => {
			if (!(await wp.connect())) {
				setStatus(SpotifyPlayerStatus.INIT_ERROR);
				return;
			}

			window.spotifyPlayer = wp;

			wp.getCurrentState().then(onPlayerStateChanged);

			wp.addListener("player_state_changed", onPlayerStateChanged);
			wp.addListener("playback_error", (obj) => {
				console.log(`playback error ${JSON.stringify(obj)}`);
				setStatus(SpotifyPlayerStatus.PLAYBACK_ERROR);
			});
			wp.addListener("initialization_error", () =>
				setStatus(SpotifyPlayerStatus.INIT_ERROR),
			);
			wp.addListener("authentication_error", () =>
				setStatus(SpotifyPlayerStatus.AUTH_ERROR),
			);
			wp.addListener("account_error", () =>
				setStatus(SpotifyPlayerStatus.ACCT_ERROR),
			);
			wp.addListener("ready", () =>
				setStatus(SpotifyPlayerStatus.NOT_CONNECTED),
			);
		});

		return () => {
			for (const event in playerEvents)
				window.spotifyPlayer?.removeListener(event as PlayerEvent);
		};
	}, [token, setPlayer, setState, setStatus]);

	return { status, player };
};

const getSpotifyPlayer = async (token: string): Promise<SpotifyPlayer> => {
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
			resolve(wrapSpotifyPlayer(spotifyPlayer, token));
		};
	});
};

export interface SpotifyPlayer extends Player, Spotify.Player {
	authToken: string;
}

const wrapSpotifyPlayer = (
	player: Spotify.Player,
	authToken: string,
): SpotifyPlayer => {
	const playbackCallbacks: PlaybackListener[] = [];
	const onTickCallbacks: OnTickCallback[] = [];

	const tick = async (ms?: number) => {
		const timeMs =
			ms !== undefined ? ms : (await player.getCurrentState())?.position;
		if (timeMs !== undefined) for (const cb of onTickCallbacks) cb(timeMs);
	};

	const playbackListenerForTick = getPlaybackListenerForTick(tick);

	const stateChangeCallback = (state: Spotify.PlaybackState | null) => {
		if (!state) return;
		const { paused } = state;
		playbackListenerForTick(paused);

		for (const cb of playbackCallbacks) cb(paused);
	};

	player.addListener("player_state_changed", stateChangeCallback);

	const additionalProperties = {
		authToken,
		seekTo(timeMs: number) {
			const posTimeMs = timeMs < 0 ? 0 : timeMs;
			player.seek(posTimeMs).then(() => tick(posTimeMs));
		},
		play() {
			return player.resume();
		},
		async getCurrentTime() {
			return (await player.getCurrentState())?.position as number;
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

export const PlayerContext = createContext({} as SpotifyPlayer);
export const usePlayer = () => useContext(PlayerContext);
