import { atom } from "jotai";
import type { Getter, PrimitiveAtom } from "jotai";

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

export const getPlatformAtoms = <PlayerClass, StatusEnum>({
	playerAtom,
	statusAtom,
	readyStatus,
	trackName,
	artist,
	paused,
}: {
	playerAtom: PrimitiveAtom<PlayerClass>;
	statusAtom: PrimitiveAtom<StatusEnum>;
	readyStatus: StatusEnum;
	trackName?: (get: Getter) => string;
	artist?: (get: Getter) => string;
	paused?: (get: Getter) => boolean;
}) => {
	return {
		player: atom((get) => {
			const isReady = get(statusAtom) === readyStatus;
			const player = get(playerAtom);
			return isReady && player ? player : undefined;
		}),
		trackName: atom(trackName ? trackName : ""),
		artist: atom(artist ? artist : ""),
		paused: atom(paused ? paused : true),
	};
};

export type PlaformAtoms = ReturnType<typeof getPlatformAtoms>;
