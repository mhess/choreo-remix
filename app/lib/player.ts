export type PlaybackListener = (paused: boolean) => void;
export type OnTickCallback = (ms: number) => void;
export type Tick = (ms?: number) => void;

export interface Player {
	play: () => Promise<void>;
	pause: () => Promise<void>;
	seekTo: (ms: number) => void;
	getCurrentTime: () => Promise<number>;
	addOnTick: (cb: OnTickCallback) => void;
	removeOnTick: (cb: OnTickCallback) => void;
}

export const getPlaybackListenerForTick = (tick: Tick) => {
	let tickIntervalId: number | undefined;

	return (paused: boolean) => {
		if (!paused) {
			if (tickIntervalId === undefined) {
				tickIntervalId = window.setInterval(tick, 100);
			}
		} else if (tickIntervalId !== undefined) {
			window.clearInterval(tickIntervalId);
			tickIntervalId = undefined;
		}
	};
};
