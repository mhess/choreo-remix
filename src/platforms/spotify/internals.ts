import { useEffect } from "react";
import { atom, useAtom, type PrimitiveAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import { spotifyTokenParam } from "~/../shared";

import { FakeSpotifyPlayer } from "./fakePlayer";
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

export const useSpotifyPlayer = (tokenFromParams: string | null) => {
	const [token, setToken] = useAtom(spotifyTokenAtom);
	const [, setPlayer] = useAtom(playerAtom);
	const [status, setStatus] = useAtom(statusAtom);
	const [, setState] = useAtom(writePlayerStateAtom);

	useEffect(() => {
		if (token) return;
		if (tokenFromParams) {
			setToken(tokenFromParams);
			getSpotifyPlayer(tokenFromParams, setState, setStatus).then(setPlayer);
		} else setStatus(SpotifyPlayerStatus.LOGGED_OUT);
	}, [token, tokenFromParams, setStatus, setToken, setPlayer, setState]);

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
			const PlayerClass = (
				token === "fake" ? FakeSpotifyPlayer : Spotify.Player
			) as typeof Spotify.Player;

			const player = new PlayerClass({
				name: "Choreo Player",
				getOAuthToken: (cb) => cb(token),
				volume: 0.5,
			});

			player.addListener("playback_error", (obj) => {
				console.error(`playback error ${JSON.stringify(obj)}`);
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

			resolve(new SpotifyPlayer(player, token, setState, setStatus));
		};
	});
};

class SpotifyPlayer extends PlatformPlayer {
	spPlayer: Spotify.Player;
	authToken: string;

	constructor(
		player: Spotify.Player,
		token: string,
		setState: (state: Spotify.PlaybackState | null) => void,
		setStatus: (status: SpotifyPlayerStatus) => void,
	) {
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
				this._onPlaybackChange(state ? state.paused : true);
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
