import { atom, useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useEffect } from "react";

import store from "~/lib/stateStore";

import {
	getPlaybackListenerForTick,
	type OnTickCallback,
	type Player,
} from "./player";

declare global {
	interface Window {
		onYouTubeIframeAPIReady: () => void;
		ytPlayerPromise?: Promise<YouTubePlayer>;
		ytPlayer: YT.Player;
	}
}

export interface YouTubePlayer extends Player {
	ytPlayer: YTPlayerWithVideoData;
}

type YTPlayerWithVideoData = YT.Player & {
	getVideoData: () => { author: string; title: string };
};

export enum YouTubePlayerStatus {
	LOADING = "Player has not loaded yet",
	LOADED = "Player has loaded",
	BUFFERING = "Waiting for video to load",
	READY = "Ready",
}

const playerStateAtom = atom<YT.PlayerState>();
export const youTubePausedAtom = atom((get) => get(playerStateAtom) !== 1);

const statusAtom = atom(YouTubePlayerStatus.LOADING);

const privatePlayerAtom = atom<YouTubePlayer>();
export const _TESTING_ONLY_setPlayer = atom(
	null,
	(_, set, player: YouTubePlayer) => {
		set(privatePlayerAtom, player);
		set(statusAtom, YouTubePlayerStatus.READY);
	},
);

export const youTubePlayerAtom = atom<YouTubePlayer | undefined>((get) => {
	const isReady = get(statusAtom) === YouTubePlayerStatus.READY;
	const player = get(privatePlayerAtom);
	return isReady && player ? player : undefined;
});

const videoDataAtom = atom((get) => {
	const player = get(youTubePlayerAtom);
	return player ? player.ytPlayer.getVideoData() : undefined;
});

export const youTubeArtistAtom = atom(
	(get) => get(videoDataAtom)?.author || "",
);
export const youTubeTrackNameAtom = atom(
	(get) => get(videoDataAtom)?.title || "",
);

const videoIdAtom = atomWithStorage<string | null>("yt-video-id", null);

export const youTubeClearVideoId = () => store.set(videoIdAtom, null);

export const YT_PLAYER_EL_ID = "ytplayer";
const YT_SCRIPT_ID = "yt-api-script";

const getYouTubePlayer = async (): Promise<YouTubePlayer> => {
	if (!document.getElementById(YT_SCRIPT_ID)) {
		const $script = document.createElement("script");
		$script.id = YT_SCRIPT_ID;
		$script.src = "https://www.youtube.com/iframe_api";
		document.body.appendChild($script);
	}

	return new Promise((resolve) => {
		window.onYouTubeIframeAPIReady = () => {
			const player = new YT.Player(YT_PLAYER_EL_ID, {
				height: "0",
				width: "0",
				playerVars: { playsinline: 1 },
				events: {
					onReady: () =>
						resolve(wrapYoutubePlayer(player as YTPlayerWithVideoData)),
					onError: (e) => console.error(`Youtube initialization error ${e}`),
				},
			});

			window.ytPlayer = player;
		};
	});
};

const wrapYoutubePlayer = (ytPlayer: YTPlayerWithVideoData): YouTubePlayer => {
	const onTickCallbacks: OnTickCallback[] = [];

	let lastTimestamp: number;
	let lastCurTime: number;

	const getMs = () => ytPlayer.getCurrentTime() * 1000;

	const tick = async (ms?: number) => {
		const timeMs = ms !== undefined ? ms : getMs();
		for (const cb of onTickCallbacks) cb(timeMs);
	};

	const playbackListenerForTick = getPlaybackListenerForTick(tick);

	ytPlayer.addEventListener("onStateChange", ({ data: state }) => {
		store.set(playerStateAtom, state);

		if (state === YT.PlayerState.CUED) {
			store.set(statusAtom, YouTubePlayerStatus.READY);
		}

		const isPaused = state !== YT.PlayerState.PLAYING;
		playbackListenerForTick(isPaused);
	});

	return {
		ytPlayer,
		async play() {
			ytPlayer.playVideo();
		},
		async pause() {
			ytPlayer.pauseVideo();
		},
		async seekTo(ms: number) {
			const posMs = ms < 0 ? 0 : ms;
			// @ts-ignore: seekTo() call with 2 args seems to break the player
			ytPlayer.seekTo(posMs / 1000);
			tick(posMs);
		},
		async getCurrentTime() {
			return getMs();
		},
		addOnTick(cb: OnTickCallback) {
			console.log("adding tick");
			cb(getMs());
			onTickCallbacks.push(cb);
		},
		removeOnTick(callback: OnTickCallback) {
			if (!onTickCallbacks.length) return;
			const index = onTickCallbacks.findIndex((cb) => cb === callback);
			if (index > -1) onTickCallbacks.splice(index, 1);
		},
	};
};

export const extractVideoIdFromUrl = (urlString: string) => {
	try {
		const url = new URL(urlString);
		if (url.hostname !== "www.youtube.com") return null;
		if (url.pathname !== "/watch") return null;
		const params = new URLSearchParams(url.search);
		return params.get("v");
	} catch {
		return null;
	}
};

export const useYouTubePlayer = () => {
	const [player, setPlayer] = useAtom(privatePlayerAtom);
	const [status, setStatus] = useAtom(statusAtom);
	const [videoId, setVideoId] = useAtom(videoIdAtom);

	useEffect(() => {
		if (!window.ytPlayerPromise) window.ytPlayerPromise = getYouTubePlayer();
		window.ytPlayerPromise.then(setPlayer);
	}, [setPlayer]);

	useEffect(() => {
		if (videoId && player) {
			setStatus(YouTubePlayerStatus.BUFFERING);
			player.ytPlayer.cueVideoById(videoId);
		} else setStatus(YouTubePlayerStatus[player ? "LOADED" : "LOADING"]);
	}, [player, videoId, setStatus]);

	return { status, setVideoId };
};
