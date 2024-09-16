import { atom } from "jotai";
import type { Getter, PrimitiveAtom, WritableAtom } from "jotai";

export type OnTickCallback = (ms: number) => void;

export abstract class PlatformPlayer {
	_onTickCallbacks: OnTickCallback[] = [];
	_tickIntervalId?: number = undefined;

	_onPlaybackChange(paused: boolean) {
		if (!paused) {
			if (this._tickIntervalId === undefined) {
				this._tickIntervalId = window.setInterval(this._tick.bind(this), 100);
			}
		} else if (this._tickIntervalId !== undefined) {
			window.clearInterval(this._tickIntervalId);
			this._tickIntervalId = undefined;
		}
	}

	async _tick(ms?: number) {
		const timeMs = ms !== undefined ? ms : await this.getCurrentTime();
		for (const cb of this._onTickCallbacks) cb(timeMs);
	}

	abstract play(): Promise<void>;

	abstract pause(): Promise<void>;

	abstract seekTo(ms: number): void;

	abstract getCurrentTime(): Promise<number>;

	async addOnTick(cb: OnTickCallback) {
		cb(await this.getCurrentTime());
		this._onTickCallbacks.push(cb);
	}

	removeOnTick(callback: OnTickCallback) {
		if (!this._onTickCallbacks.length) return;
		const index = this._onTickCallbacks.findIndex((cb) => cb === callback);
		if (index > -1) this._onTickCallbacks.splice(index, 1);
	}
}

type PlatformAtom<T, T1 = T> = WritableAtom<T | T1, [T], void>;

export const getPlatformAtoms = <PlayerClass, StatusEnum>({
	playerAtom,
	statusAtom,
	readyStatus,
	trackName: trackNameGetter,
	artist: artistGetter,
	paused: pausedGetter,
}: {
	playerAtom: PrimitiveAtom<PlayerClass>;
	statusAtom: PrimitiveAtom<StatusEnum>;
	readyStatus: StatusEnum;
	trackName?: (get: Getter) => string;
	artist?: (get: Getter) => string;
	paused?: (get: Getter) => boolean;
}) => {
	const testTrackNameAtom = atom("");
	const testArtistAtom = atom("");
	const testPausedAtom = atom<boolean>();

	return {
		player: atom(
			(get) => {
				const isReady = get(statusAtom) === readyStatus;
				const player = get(playerAtom);
				return isReady && player ? player : undefined;
			},
			(_, set, player: PlatformPlayer) => {
				if (!window.__testing__) throw "For tests only!";
				set(statusAtom, readyStatus);
				set(playerAtom, player as PlayerClass);
			},
		) as PlatformAtom<PlatformPlayer, undefined>,
		trackName: (trackNameGetter
			? atom(
					(get) => get(testTrackNameAtom) || trackNameGetter(get),
					(_, set, trackName: string) => {
						if (!window.__testing__) throw "For tests only!";
						set(testTrackNameAtom, trackName);
					},
				)
			: testTrackNameAtom) as PlatformAtom<string>,
		artist: (artistGetter
			? atom(
					(get) => get(testArtistAtom) || artistGetter(get),
					(_, set, artist: string) => {
						if (!window.__testing__) throw "For tests only!";
						set(testArtistAtom, artist);
					},
				)
			: testArtistAtom) as PlatformAtom<string>,
		paused: (pausedGetter
			? atom(
					(get) =>
						get(testPausedAtom) !== undefined
							? get(testPausedAtom)
							: pausedGetter(get),
					(_, set, paused: boolean) => {
						if (!window.__testing__) throw "For tests only!";
						set(testPausedAtom, paused);
					},
				)
			: testPausedAtom) as PlatformAtom<boolean>,
	};
};

export type PlatformAtoms = ReturnType<typeof getPlatformAtoms>;
