import { atom, useAtom, type PrimitiveAtom } from "jotai";
import { useEffect, useRef } from "react";

import { getPlatformAtoms, PlatformPlayer } from "~/lib/player";

export enum FilePlayerStatus {
	NO_FILE = "No file provided",
	LOADING = "Loading data",
	READY = "Ready",
}

const playerAtom = atom<AudioFilePlayer>();
const statusAtom = atom(FilePlayerStatus.NO_FILE);
const pausedAtom = atom(true);
const writePausedAtom = atom(null, (_, set, paused: boolean) => {
	set(pausedAtom, paused);
});
const audioFileSrcAtom = atom<File>();

export const atoms = getPlatformAtoms({
	playerAtom: playerAtom as PrimitiveAtom<AudioFilePlayer | undefined>,
	paused: (get) => get(pausedAtom),
	statusAtom,
	readyStatus: FilePlayerStatus.READY,
	trackName: (get) => get(audioFileSrcAtom)?.name || "",
});

export const audioFileAtom = atom(
	(get) => get(audioFileSrcAtom),
	(_, set, file?: File) => {
		set(audioFileSrcAtom, file);
		set(statusAtom, FilePlayerStatus[file ? "LOADING" : "NO_FILE"]);
	},
);

export const useAudioFilePlayer = () => {
	const audioElRef = useRef<HTMLAudioElement>();
	const [file, setFile] = useAtom(audioFileAtom);
	const [status, setStatus] = useAtom(statusAtom);
	const [, setPaused] = useAtom(writePausedAtom);
	const [, setPlayer] = useAtom(playerAtom);

	useEffect(() => {
		audioElRef.current = document.createElement("audio");
		document.body.appendChild(audioElRef.current);
		() => audioElRef.current?.remove();
	}, []);

	useEffect(() => {
		const $audioEl = audioElRef.current;
		if (!file || !$audioEl) return;

		setPlayer(new AudioFilePlayer($audioEl, file, setStatus, setPaused));
		() => file && setStatus(FilePlayerStatus.LOADING);
	}, [file]);

	return { status, setFile };
};

class AudioFilePlayer extends PlatformPlayer {
	$audioEl: HTMLAudioElement;

	constructor(
		$el: HTMLAudioElement,
		file: File,
		setStatus: (status: FilePlayerStatus) => void,
		setPaused: (paused: boolean) => void,
	) {
		super();

		this.$audioEl = $el;
		$el.addEventListener("canplay", () => setStatus(FilePlayerStatus.READY));
		$el.addEventListener("play", () => {
			this._onPlaybackChange(false);
			setPaused(false);
		});
		$el.addEventListener("pause", () => {
			this._onPlaybackChange(true);
			setPaused(true);
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
