import { useEffect } from "react";
import { atom, useAtom, type PrimitiveAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import { spotifyTokenParam } from "~/../shared";

import { getFakePlayer } from "./fakePlayer";
import { PlatformPlayer, getPlatformAtoms } from "~/lib/player";

export enum SpotifyPlayerStatus {
	LOGGED_OUT = "loggedOut",
	LOADING = "loading",
	NOT_CONNECTED = "deviceNotConnected",
	INIT_ERROR = "initializationError",
	AUTH_ERROR = "authError",
	ACCT_ERROR = "accountError",
	PLAYBACK_ERROR = "playbackError",
	READY = "ready",
}

export const spotifyTokenAtom = atomWithStorage<string | null>(
	spotifyTokenParam,
	null,
);

export const spotifyAuthAtom = atom(
	(get) => !!get(spotifyTokenAtom),
	(_, set) => set(spotifyTokenAtom, null),
);

const statusAtom = atom(SpotifyPlayerStatus.LOADING);
const playerAtom = atom<SpotifyPlayer>();
const playerStateAtom = atom<Spotify.PlaybackState | null>(null);
const writePlayerStateAtom = atom(
	null,
	(_, set, newState: Spotify.PlaybackState | null) => {
		set(playerStateAtom, newState);
	},
);

const currentTrackAtom = atom(
	(get) => get(playerStateAtom)?.track_window.current_track,
);
export const writeStatusAtom = atom(
	null,
	(_, set, newStatus: SpotifyPlayerStatus) => {
		set(statusAtom, newStatus);
	},
);

export const atoms = getPlatformAtoms({
	playerAtom: playerAtom as PrimitiveAtom<SpotifyPlayer | undefined>,
	statusAtom: statusAtom,
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

// This variable is needed because the root component gets mounted/unmounted
// which can cause multiple player instances to get initialized if the data is
// only stored in React state.
let tokenAndPromise: {
	token: string;
	promise: Promise<SpotifyPlayer> | undefined;
};

export const useSpotifyPlayer = (tokenFromParams: string | null) => {
	const [token, setToken] = useAtom(spotifyTokenAtom);
	const [player, setPlayer] = useAtom(playerAtom);
	const [status, setStatus] = useAtom(statusAtom);
	const [, setState] = useAtom(writePlayerStateAtom);

	useEffect(() => {
		if (tokenFromParams) setToken(tokenFromParams);

		if (!token) {
			if (!tokenFromParams) setStatus(SpotifyPlayerStatus.LOGGED_OUT);
			return;
		}

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
					? Promise.resolve(
							new SpotifyPlayer({
								player: getFakePlayer(),
								token,
								setState,
								setStatus,
							}),
						)
					: getSpotifyPlayer(token, setState, setStatus);
			tokenAndPromise = { token, promise };
		}

		tokenAndPromise.promise?.then(setPlayer);
	}, [token]);

	return status;
};

const SPOTIFY_SCRIPT_ID = "spotify-sdk-script";

const getSpotifyPlayer = async (
	token: string,
	setState: (state: Spotify.PlaybackState | null) => void,
	setStatus: (status: SpotifyPlayerStatus) => void,
): Promise<SpotifyPlayer> => {
	if (!document.getElementById(SPOTIFY_SCRIPT_ID)) {
		const $script = document.createElement("script");
		$script.id = SPOTIFY_SCRIPT_ID;
		$script.src = "https://sdk.scdn.co/spotify-player.js";
		document.body.appendChild($script);
	}

	return new Promise((resolve) => {
		window.onSpotifyWebPlaybackSDKReady = async () => {
			const player = new Spotify.Player({
				name: "Choreo Player",
				getOAuthToken: (cb) => cb(token),
				volume: 0.5,
			});

			player.addListener("playback_error", (obj) => {
				console.log(`playback error ${JSON.stringify(obj)}`);
				setStatus(SpotifyPlayerStatus.PLAYBACK_ERROR);
			});
			player.addListener("initialization_error", () =>
				setStatus(SpotifyPlayerStatus.INIT_ERROR),
			);
			player.addListener("authentication_error", () =>
				setStatus(SpotifyPlayerStatus.AUTH_ERROR),
			);
			player.addListener("account_error", () =>
				setStatus(SpotifyPlayerStatus.ACCT_ERROR),
			);
			player.addListener("ready", () =>
				setStatus(SpotifyPlayerStatus.NOT_CONNECTED),
			);

			resolve(new SpotifyPlayer({ player, token, setState, setStatus }));
		};
	});
};

class SpotifyPlayer extends PlatformPlayer {
	spPlayer: Spotify.Player;
	authToken: string;

	constructor({
		player,
		token,
		setState,
		setStatus,
	}: {
		player: Spotify.Player;
		token: string;
		setState: (state: Spotify.PlaybackState | null) => void;
		setStatus: (status: SpotifyPlayerStatus) => void;
	}) {
		super();

		this.spPlayer = player;
		this.authToken = token;

		player.connect().then((isConnected) => {
			if (!isConnected) {
				setStatus(SpotifyPlayerStatus.INIT_ERROR);
				return;
			}

			const onStateChange = (state: Spotify.PlaybackState | null) => {
				setState(state);
				setStatus(
					state ? SpotifyPlayerStatus.READY : SpotifyPlayerStatus.NOT_CONNECTED,
				);
				this._onPlaybackChange(!!state?.paused);
			};

			player.getCurrentState().then(onStateChange);

			player.addListener("player_state_changed", onStateChange);
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
