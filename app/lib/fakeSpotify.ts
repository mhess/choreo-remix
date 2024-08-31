type ListenerMap = {
	ready?: Spotify.PlaybackInstanceListener[];
	not_ready?: Spotify.PlaybackInstanceListener[];
	autoplay_failed?: Spotify.EmptyListener[];
	player_state_changed?: Spotify.PlaybackStateListener[];
} & { [key in Spotify.ErrorTypes]?: Spotify.ErrorListener[] };

export const getFakePlayer = () => {
	const listeners = {} as ListenerMap;

	let playStarted = 0;
	let currentState: Spotify.PlaybackState = {
		paused: true,
		position: 0,
		track_window: {
			current_track: {
				name: "Track Name! That is Really Really Long",
				artists: [{ name: "First Artist" }],
			},
		},
	} as Spotify.PlaybackState;

	const invokeStateListeners = () => {
		const callbacks = listeners.player_state_changed;
		if (callbacks) for (const cb of callbacks) cb(currentState);
	};

	return {
		async pause() {
			if (currentState.paused) return;
			currentState.paused = true;
			currentState.position = Date.now() - playStarted;
			invokeStateListeners();
		},
		async connect() {
			return true;
		},
		async getCurrentState() {
			const { paused, position } = currentState;
			const stateWithPosition = {
				...currentState,
				position: paused ? position : Date.now() - playStarted,
			};
			return stateWithPosition;
		},
		async seek(ms: number) {
			const bounded = ms < 0 ? 0 : ms;
			playStarted = Date.now() - bounded;
			currentState = { ...currentState, position: bounded };
		},
		async togglePlay() {
			const { paused, position } = currentState;
			if (paused) playStarted = Date.now() - position;
			const newPosition = paused ? position : Date.now() - playStarted;
			currentState = {
				...currentState,
				paused: !paused,
				position: newPosition,
			};
			invokeStateListeners();
		},
		addListener(eventName, callback) {
			const callbacks = listeners[eventName];
			if (callbacks) {
				// @ts-ignore
				callbacks.push(callback);
				// @ts-ignore
			} else listeners[eventName] = [callback];
		},
		removeListener(eventName, callback?) {
			const callbacks = listeners[eventName];
			if (!callbacks) return;
			if (callback) {
				const index = callbacks.findIndex((cb) => cb === callback);
				if (index > -1) callbacks.splice(index, 1);
			} else delete listeners[eventName];
		},
	} as Spotify.Player;
};
