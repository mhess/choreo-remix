// biome-ignore lint/suspicious/noExplicitAny: necessary
type ListenerFunction = (...args: any[]) => void;

class EventEmitter {
	_listeners: Record<string, ListenerFunction[]>;

	constructor() {
		this._listeners = {};
	}

	on(event: string, listener: ListenerFunction) {
		if (!this._listeners[event]) {
			this._listeners[event] = [];
		}
		this._listeners[event].push(listener);
		return () => this.off(event, listener); // Return a function to unsubscribe
	}

	addListener(...args: Parameters<EventEmitter["on"]>) {
		return this.on(...args);
	}

	off(event: string, listener?: ListenerFunction) {
		if (this._listeners[event]) {
			if (listener)
				this._listeners[event] = this._listeners[event].filter(
					(l) => l !== listener,
				);
			else delete this._listeners[event];
		}
	}

	removeListener(...args: Parameters<EventEmitter["off"]>) {
		this.off(...args);
	}

	emit(event: string, ...args: Parameters<ListenerFunction>) {
		if (this._listeners[event]) {
			for (const cb of this._listeners[event]) cb(...args);
		}
	}
}

export class FakeSpotifyPlayer extends EventEmitter {
	_currentState: Spotify.PlaybackState | null;
	_playStarted = 0;
	init: Spotify.PlayerInit;

	constructor(init: Spotify.PlayerInit) {
		super();
		this.init = init;
		this._currentState = null;
	}

	_setPlayerReady() {
		this._currentState = {
			paused: true,
			position: 0,
			track_window: {
				current_track: {
					name: "Track Name! That is Really Really Long",
					artists: [{ name: "First Artist" }],
				},
			},
		} as Spotify.PlaybackState;
		this.emit("player_state_changed", this._currentState);
	}

	async pause() {
		if (!this._currentState) throw "Player is not ready";
		if (this._currentState.paused) return;
		this._currentState = {
			...this._currentState,
			paused: true,
			position: Date.now() - this._playStarted,
		};
		this.emit("player_state_changed", this._currentState);
	}

	async resume() {
		if (!this._currentState) throw "Player is not ready";
		const { paused, position } = this._currentState;
		if (!paused) return;
		this._playStarted = Date.now() - position;
		this._currentState = { ...this._currentState, paused: false };
		this.emit("player_state_changed", this._currentState);
	}

	async connect() {
		this._setPlayerReady();
		return true;
	}

	async getCurrentState() {
		if (!this._currentState) return this._currentState;
		const { paused, position } = this._currentState;
		const stateWithPosition = {
			...this._currentState,
			position: paused ? position : Date.now() - this._playStarted,
		};
		return stateWithPosition;
	}

	async seek(ms: number) {
		if (!this._currentState) throw "Player is not ready";
		const bounded = ms < 0 ? 0 : ms;
		this._playStarted = Date.now() - bounded;
		this._currentState = { ...this._currentState, position: bounded };
	}
}
