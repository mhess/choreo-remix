import { atom, useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useEffect } from "react";

import store from "~/lib/stateStore";

import { Player } from "./player";

declare global {
	interface Window {
		onYouTubeIframeAPIReady: () => void;
		ytPlayerPromise?: Promise<YouTubePlayer>;
		ytPlayer: YT.Player;
	}
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
export const _TESTING_ONLY_setYouTubePlayer = atom(
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
						resolve(new YouTubePlayer(player as YTPlayerWithVideoData)),
					onError: (e) => console.error(`Youtube initialization error ${e}`),
				},
			});

			window.ytPlayer = player;
		};
	});
};

class YouTubePlayer extends Player {
	ytPlayer: YTPlayerWithVideoData;

	constructor(ytPlayer: YTPlayerWithVideoData) {
		super();

		this.ytPlayer = ytPlayer;

		ytPlayer.addEventListener("onStateChange", ({ data: state }) => {
			store.set(playerStateAtom, state);

			if (state === YT.PlayerState.CUED) {
				store.set(statusAtom, YouTubePlayerStatus.READY);
			}

			const isPaused = state !== YT.PlayerState.PLAYING;
			this._onPlaybackChange(isPaused);
		});
	}

	async play() {
		this.ytPlayer.playVideo();
	}

	async pause() {
		this.ytPlayer.pauseVideo();
	}

	async seekTo(ms: number) {
		const posMs = ms < 0 ? 0 : ms;
		// @ts-ignore: seekTo() call with 2 args seems to break the player
		this.ytPlayer.seekTo(posMs / 1000);
		this._tick(posMs);
	}

	async getCurrentTime() {
		return this.ytPlayer.getCurrentTime() * 1000;
	}
}

type YouTubePlayerType = InstanceType<typeof YouTubePlayer>;
export type { YouTubePlayerType as YouTubePlayer };

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
