const RESOLVED_PROMISE = Promise.resolve();
export type PlayerEvent = "ready" | "not_ready" | "player_state_changed";
type ListenerMap = { [key in PlayerEvent]: Function[] };

export const getFakePlayer = () => {
	const listeners = {} as ListenerMap;

	let playStarted = 0;
	let currentState: Spotify.PlaybackState = {
		paused: true,
		position: 0,
		track_window: {
			current_track: {
				name: "Track Name!",
				artists: [{ name: "First Artist" }],
			},
		},
	} as Spotify.PlaybackState;

	return {
		getCurrentState() {
			const { paused, position } = currentState;
			const stateWithPosition = {
				...currentState,
				position: paused ? position : Date.now() - playStarted,
			};
			return Promise.resolve(stateWithPosition);
		},
		seek(ms: number) {
			const bounded = ms < 0 ? 0 : ms;
			playStarted = Date.now() - bounded;
			currentState = { ...currentState, position: bounded };
			return RESOLVED_PROMISE;
		},
		togglePlay() {
			const { paused, position } = currentState;
			if (paused) playStarted = Date.now() - position;
			const newPosition = paused ? position : Date.now() - playStarted;
			currentState = {
				...currentState,
				paused: !paused,
				position: newPosition,
			};
			listeners.player_state_changed?.forEach((cb) => cb(currentState));
			return RESOLVED_PROMISE;
		},
		addListener(eventName: PlayerEvent, callback: Function) {
			const callbacks = listeners[eventName];
			if (callbacks) callbacks.push(callback);
			else listeners[eventName] = [callback];
		},
		removeListener(eventName: PlayerEvent, callback?: Function) {
			const callbacks = listeners[eventName];
			if (!callbacks) return;
			if (callback) {
				const index = callbacks.findIndex((cb) => cb === callback);
				if (index > -1) callbacks.splice(index, 1);
			} else delete listeners[eventName];
		},
	} as Spotify.Player;
};
