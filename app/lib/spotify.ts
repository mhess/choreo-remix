import { useEffect, useState, useContext, createContext } from "react";
import { getFakePlayer } from "./fakeSpotify";

const getSpotifyPlayer = async (token: string): Promise<WrappedPlayer> => {
	console.log("getSpotifyPlayer");
	const $script = document.createElement("script");
	$script.src = "https://sdk.scdn.co/spotify-player.js";
	document.body.appendChild($script);

	return new Promise((resolve) => {
		window.onSpotifyWebPlaybackSDKReady = async () => {
			const player = new Spotify.Player({
				name: "Choreo Player",
				getOAuthToken: (cb) => cb(token),
				volume: 0.5,
			});

			if (await player.connect()) {
				console.log("connected");
				player.addListener("not_ready", () => console.log("not ready"));
				player.addListener("ready", () => {
					console.log("ready");
					resolve(createWrappedPlayer(player));
				});
				player.on("authentication_error", console.log);
				player.on("account_error", console.log);
				player.on("playback_error", console.log);
			} else {
				console.log("oops!");
				// reject("oops!");
			}
		};
	});
};

export enum PlayerStatus {
	LOADING = "loading",
	NOT_CONNECTED = "notConnected",
	READY = "ready",
}

let tokenWithPromise: { token: string; promise: Promise<WrappedPlayer> };
export const useSpotifyPlayer = (token: string) => {
	const [player, setPlayer] = useState<WrappedPlayer>();
	const [status, setStatus] = useState<PlayerStatus>(PlayerStatus.LOADING);

	const setPlayerAndStatus = (
		state: Spotify.PlaybackState | null,
		player: WrappedPlayer,
	) => {
		if (state) {
			setStatus(PlayerStatus.READY);
			setPlayer(player);
		} else {
			setStatus(PlayerStatus.NOT_CONNECTED);
			setPlayer(undefined);
		}
	};

	useEffect(() => {
		if (tokenWithPromise?.token === token) {
			if (!player) tokenWithPromise.promise.then(setPlayer);
			return;
		}
		const promise =
			token === "fake"
				? Promise.resolve(createWrappedPlayer(getFakePlayer()))
				: getSpotifyPlayer(token);
		tokenWithPromise = { token, promise };
		promise.then((p) => {
			window.player = p;
			p.getCurrentState().then((state) => setPlayerAndStatus(state, p));
			p.addListener("player_state_changed", (state) =>
				setPlayerAndStatus(state, p),
			);
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
	seekTo: (ms: number) => void;
	addOnStateChange: CallbackHandler;
	removeOnStateChange: CallbackHandler;
	addOnTick: CallbackHandler;
	removeOnTick: CallbackHandler;
};

const createWrappedPlayer = (player: Spotify.Player): WrappedPlayer => {
	const tick = () =>
		player.getCurrentState().then((state) => {
			state && onTickCallbacks.forEach((cb) => cb(state));
		});

	const mainCallback = (state: Spotify.PlaybackState | null) => {
		if (!state) return;
		if (!state.paused) {
			intervalId = setInterval(tick, 100);
		} else {
			clearInterval(intervalId);
		}
		playerStateCallbacks.forEach((cb) => cb(state));
	};
	player.addListener("player_state_changed", mainCallback);

	const additionalMethods = {
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

	return Object.assign(player, additionalMethods);
};

export const PlayerContext = createContext({} as WrappedPlayer);
export const usePlayer = () => useContext(PlayerContext);
