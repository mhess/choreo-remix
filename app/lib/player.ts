export type OnTickCallback = (ms: number) => void;
export type Tick = (ms?: number) => void;

export class Player {
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

	async play() {
		throw "play() not implemented!";
	}

	async pause() {
		throw "pause() not implemented!";
	}

	seekTo(ms: number) {
		throw "seekTo() not implemented!";
	}

	async getCurrentTime(): Promise<number> {
		throw "getCurrentTime() not implemented!";
	}

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
