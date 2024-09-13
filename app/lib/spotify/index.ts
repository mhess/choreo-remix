import { useEffect } from "react";
import { atom, useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import store from "~/lib/stateStore";
import { getFakePlayer } from "./fakePlayer";
import { PlatformPlayer, getPlatformAtoms } from "../player";

export enum SpotifyPlayerStatus {
	LOADING = "loading",
	NOT_CONNECTED = "deviceNotConnected",
	INIT_ERROR = "initializationError",
	AUTH_ERROR = "authError",
	ACCT_ERROR = "accountError",
	PLAYBACK_ERROR = "playbackError",
	READY = "ready",
}

export const SPOTIFY_TOKEN_PARAM = "spotifyToken";
const SPOTIFY_SCRIPT_ID = "spotify-sdk-script";

const statusAtom = atom(SpotifyPlayerStatus.LOADING);
const playerAtom = atom<SpotifyPlayer>();
const playerStateAtom = atom<Spotify.PlaybackState | null>(null);
const currentTrackAtom = atom(
	(get) => get(playerStateAtom)?.track_window.current_track,
);

export const atoms = getPlatformAtoms({
	playerAtom,
	statusAtom,
	readyStatus: SpotifyPlayerStatus.READY,
	artist: (get) => {
		const track = get(currentTrackAtom);
		if (!track) return "";

		return track.artists.map(({ name }) => name).join(", ");
	},
	trackName: (get) => {
		const track = get(currentTrackAtom);
		return track ? track.name : "";
	},
	paused: (get) => {
		const state = get(playerStateAtom);
		return state ? state.paused : true;
	},
});

export const spotifyTokenAtom = atomWithStorage<string | null>(
	SPOTIFY_TOKEN_PARAM,
	null,
);

export const spotifyAuthAtom = atom(
	(get) => !!get(spotifyTokenAtom),
	(_, set) => set(spotifyTokenAtom, null),
);

export const _TESTING_ONLY_setSpotifyPlayer = atom(
	null,
	(_, set, player: SpotifyPlayer) => {
		set(playerAtom, player);
		set(statusAtom, SpotifyPlayerStatus.READY);
	},
);

// This variable is needed because the root component gets mounted/unmounted
// which can cause multiple player instances to get initialized if the data is
// only stored in React state.
let tokenAndPromise: {
	token: string;
	promise: Promise<SpotifyPlayer> | undefined;
};

export const useSpotifyPlayer = (token: string | null) => {
	const [player, setPlayer] = useAtom(playerAtom);
	const [status, setStatus] = useAtom(statusAtom);

	useEffect(() => {
		if (!token) return;

		// Use the player from the Window if it has a correct token
		if (player && player.authToken === token) {
			const promise = Promise.resolve(player);
			tokenAndPromise = { token, promise };
		} else if (
			!tokenAndPromise ||
			token !== tokenAndPromise.token ||
			!tokenAndPromise.promise
		) {
			// In this case the window.spotifyPlayer would have a differnet token.
			player?.spPlayer.disconnect();
			const promise =
				token === "fake"
					? Promise.resolve(new SpotifyPlayer(getFakePlayer(), token))
					: getSpotifyPlayer(token);
			tokenAndPromise = { token, promise };
		}

		tokenAndPromise.promise?.then(setPlayer);
	}, [token]);

	return status;
};

const getSpotifyPlayer = async (token: string): Promise<SpotifyPlayer> => {
	if (!document.getElementById(SPOTIFY_SCRIPT_ID)) {
		const $script = document.createElement("script");
		$script.id = SPOTIFY_SCRIPT_ID;
		$script.src = "https://sdk.scdn.co/spotify-player.js";
		document.body.appendChild($script);
	}

	return new Promise((resolve) => {
		window.onSpotifyWebPlaybackSDKReady = async () => {
			const spPlayer = new Spotify.Player({
				name: "Choreo Player",
				getOAuthToken: (cb) => cb(token),
				volume: 0.5,
			});

			spPlayer.addListener("playback_error", (obj) => {
				console.log(`playback error ${JSON.stringify(obj)}`);
				store.set(statusAtom, SpotifyPlayerStatus.PLAYBACK_ERROR);
			});
			spPlayer.addListener("initialization_error", () =>
				store.set(statusAtom, SpotifyPlayerStatus.INIT_ERROR),
			);
			spPlayer.addListener("authentication_error", () =>
				store.set(statusAtom, SpotifyPlayerStatus.AUTH_ERROR),
			);
			spPlayer.addListener("account_error", () =>
				store.set(statusAtom, SpotifyPlayerStatus.ACCT_ERROR),
			);
			spPlayer.addListener("ready", () =>
				store.set(statusAtom, SpotifyPlayerStatus.NOT_CONNECTED),
			);

			resolve(new SpotifyPlayer(spPlayer, token));
		};
	});
};

class SpotifyPlayer extends PlatformPlayer {
	spPlayer: Spotify.Player;
	authToken: string;

	constructor(spPlayer: Spotify.Player, authToken: string) {
		super();

		this.spPlayer = spPlayer;
		this.authToken = authToken;

		spPlayer.connect().then((isConnected) => {
			if (!isConnected) {
				store.set(statusAtom, SpotifyPlayerStatus.INIT_ERROR);
				return;
			}

			const onStateChange = (state: Spotify.PlaybackState | null) => {
				store.set(playerStateAtom, state);
				store.set(
					statusAtom,
					state ? SpotifyPlayerStatus.READY : SpotifyPlayerStatus.NOT_CONNECTED,
				);
				this._onPlaybackChange(!!state?.paused);
			};

			spPlayer.getCurrentState().then(onStateChange);

			spPlayer.addListener("player_state_changed", onStateChange);
		});
	}

	play() {
		return this.spPlayer.resume();
	}

	pause() {
		return this.spPlayer.pause();
	}

	async seekTo(ms: number) {
		await this.spPlayer.seek(ms);
		this._tick(ms);
	}

	async getCurrentTime() {
		return ((await this.spPlayer.getCurrentState()) as Spotify.PlaybackState)
			.position;
	}
}

type SpotifyPlayerType = InstanceType<typeof SpotifyPlayer>;

export type { SpotifyPlayerType as SpotifyPlayer };
