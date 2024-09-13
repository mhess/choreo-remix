import { atom, useAtom } from "jotai";
import { useEffect, useRef } from "react";

import store from "./stateStore";
import { getPlatformAtoms, PlatformPlayer } from "./player";

export enum FilePlayerStatus {
	NO_FILE = "No file provided",
	LOADING = "Loading data",
	READY = "Ready",
}

const playerAtom = atom<AudioFilePlayer>();
const statusAtom = atom(FilePlayerStatus.NO_FILE);
const audioFileAtom = atom<File>();

export const atoms = getPlatformAtoms({
	playerAtom,
	statusAtom,
	readyStatus: FilePlayerStatus.READY,
	trackName: (get) => get(audioFileAtom)?.name || "",
});

export const _TESTING_ONLY_setAudioFilePlayer = atom(
	null,
	(_, set, player: AudioFilePlayer) => {
		set(playerAtom, player);
		set(statusAtom, FilePlayerStatus.READY);
	},
);

const setFile = (file: File) => {
	store.set(audioFileAtom, file);
	store.set(statusAtom, FilePlayerStatus[file ? "LOADING" : "NO_FILE"]);
};

export const audioFileClearFile = () => store.set(audioFileAtom, undefined);

class AudioFilePlayer extends PlatformPlayer {
	$audioEl: HTMLAudioElement;

	constructor($el: HTMLAudioElement, file: File) {
		super();

		this.$audioEl = $el;
		$el.addEventListener("canplay", () =>
			store.set(statusAtom, FilePlayerStatus.READY),
		);
		$el.addEventListener("play", () => {
			this._onPlaybackChange(false);
			store.set(atoms.paused, false);
		});
		$el.addEventListener("pause", () => {
			this._onPlaybackChange(true);
			store.set(atoms.paused, true);
		});
		$el.src = URL.createObjectURL(file);
	}

	async play() {
		this.$audioEl.play();
	}

	async pause() {
		this.$audioEl.pause();
	}

	seekTo(ms: number) {
		this.$audioEl.currentTime = ms / 1000;
		this._tick(ms);
	}

	async getCurrentTime() {
		return this.$audioEl.currentTime * 1000;
	}
}

type AudioFilePlayerType = InstanceType<typeof AudioFilePlayer>;
export type { AudioFilePlayerType as AudioFilePlayer };

export const useAudioFilePlayer = () => {
	const audioElRef = useRef<HTMLAudioElement>();
	const [file] = useAtom(audioFileAtom);
	const [status, setStatus] = useAtom(statusAtom);

	useEffect(() => {
		audioElRef.current = document.createElement("audio");
		document.body.appendChild(audioElRef.current);
		() => audioElRef.current?.remove();
	}, []);

	useEffect(() => {
		const $audioEl = audioElRef.current;
		if (!file || !$audioEl) return;

		store.set(playerAtom, new AudioFilePlayer($audioEl, file));
		() => file && setStatus(FilePlayerStatus.LOADING);
	}, [file]);

	return { status, setFile, audioElRef };
};
