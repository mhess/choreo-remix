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

export enum YouTubePlayerStatus {
	LOADING = "loading",
	LOADED = "loaded",
	BUFFERING = "buffering",
	READY = "ready",
}

export const youTubePlayerStateAtom = atom<YT.PlayerState>();
export const youTubePlayerStatusAtom = atom<YouTubePlayerStatus>(
	YouTubePlayerStatus.LOADING,
);
export const youTubePlayerAtom = atom<YouTubePlayer>();
export const youTubeVideoIdAtom = atomWithStorage<string | undefined>(
	"yt-video-id",
	undefined,
);

export const YT_PLAYER_EL_ID = "ytplayer";
const YT_SCRIPT_ID = "yt-api-script";

const getYoutubePlayer = async (): Promise<YouTubePlayer> => {
	if (!document.getElementById(YT_SCRIPT_ID)) {
		const $script = document.createElement("script");
		$script.id = YT_SCRIPT_ID;
		$script.src = "https://www.youtube.com/iframe_api";
		document.body.appendChild($script);
	}

	if (window.ytPlayerPromise) return window.ytPlayerPromise;

	window.ytPlayerPromise = new Promise((resolve) => {
		window.onYouTubeIframeAPIReady = () => {
			const player = new YT.Player(YT_PLAYER_EL_ID, {
				height: "0",
				width: "0",
				playerVars: { playsinline: 1 },
				events: {
					onReady: () => {
						resolve(wrapYoutubePlayer(player));
						store.set(youTubePlayerStatusAtom, YouTubePlayerStatus.LOADED);
					},
					onError: (e) => console.error(`Youtube initialization error ${e}`),
				},
			});

			window.ytPlayer = player;
		};
	});

	return window.ytPlayerPromise;
};

export interface YouTubePlayer
	extends Player,
		Omit<YT.Player, "getCurrentTime" | "seekTo"> {
	setVideoId: (videoId: string) => void;
}

const wrapYoutubePlayer = (player: YT.Player): YouTubePlayer => {
	const onTickCallbacks: OnTickCallback[] = [];
	const originalSeekTo = player.seekTo;
	const originalGetCurrentTime = player.getCurrentTime;

	const tick = async (ms?: number) => {
		const timeMs = ms ? ms : await player.getCurrentTime();
		for (const cb of onTickCallbacks) cb(timeMs);
	};

	const playbackListenerForTick = getPlaybackListenerForTick(tick);

	player.addEventListener("onStateChange", ({ data: state }) => {
		console.log({ state });

		if (state === YT.PlayerState.UNSTARTED)
			store.set(youTubePlayerStatusAtom, YouTubePlayerStatus.READY);

		store.set(youTubePlayerStateAtom, state);
		const isPaused = state !== YT.PlayerState.PLAYING;
		playbackListenerForTick(isPaused);
	});

	const additionalProperties = {
		setVideoId(videoId: string) {
			store.set(youTubeVideoIdAtom, videoId);
			store.set(youTubePlayerStatusAtom, YouTubePlayerStatus.BUFFERING);
		},
		async play() {
			player.playVideo();
		},
		async pause() {
			player.pauseVideo();
		},
		seekTo(ms: number) {
			originalSeekTo.call(player, ms / 1000, false);
			tick(ms);
		},
		async getCurrentTime() {
			return originalGetCurrentTime.call(player) * 1000;
		},
		async addOnTick(cb: OnTickCallback) {
			cb(await player.getCurrentTime());
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
	const [player, setPlayer] = useAtom(youTubePlayerAtom);

	useEffect(() => {
		if (!window.ytPlayerPromise) getYoutubePlayer();
		window.ytPlayerPromise?.then(setPlayer);
	}, [setPlayer]);

	return player;
};
