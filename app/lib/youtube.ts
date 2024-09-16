import { atom, useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useEffect } from "react";

import store from "~/lib/stateStore";

import { getPlatformAtoms, PlatformPlayer } from "./player";

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

const videoIdAtom = atomWithStorage<string | null>("yt-video-id", null);

export const youTubeClearVideoId = () => store.set(videoIdAtom, null);

const playerAtom = atom<YouTubePlayer>();
const statusAtom = atom(YouTubePlayerStatus.LOADING);

const videoDataAtom = atom((get) => {
	const player = get(playerAtom);
	const isReady = player && get(statusAtom) === YouTubePlayerStatus.READY;
	return isReady ? player.ytPlayer.getVideoData() : undefined;
});

export const atoms = getPlatformAtoms({
	playerAtom,
	statusAtom,
	readyStatus: YouTubePlayerStatus.READY,
	artist: (get) => get(videoDataAtom)?.author || "",
	trackName: (get) => get(videoDataAtom)?.title || "",
});

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

class YouTubePlayer extends PlatformPlayer {
	ytPlayer: YTPlayerWithVideoData;

	constructor(ytPlayer: YTPlayerWithVideoData) {
		super();

		this.ytPlayer = ytPlayer;

		ytPlayer.addEventListener("onStateChange", ({ data: state }) => {
			const isPaused = state !== YT.PlayerState.PLAYING;
			store.set(atoms.paused, isPaused);

			if (state === YT.PlayerState.CUED) {
				store.set(statusAtom, YouTubePlayerStatus.READY);
			}

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
	const [player, setPlayer] = useAtom(playerAtom);
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
