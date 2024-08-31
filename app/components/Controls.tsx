import { useContext, useEffect, useState } from "react";

import { EntriesContext } from "../lib/entries";
import { usePlayer } from "../lib/spotify";
import type { OnTickCallback } from "../lib/spotify";
import { displayMs } from "../lib/utils";

import Icon from "./Icon";

export default () => {
	const { addEntry } = useContext(EntriesContext);
	const player = usePlayer();
	const [paused, setPaused] = useState(false);

	useEffect(() => {
		const cb: Spotify.PlaybackStateListener = ({ paused }) => setPaused(paused);
		player.addOnStateChange(cb);
		return () => player.removeOnStateChange(cb);
	}, []);

	const handleSeekDir = (ms: number) => async () => {
		const state = await player.getCurrentState();
		if (!state) return;
		player.seekTo(ms + state.position);
	};

	const handleAddEntry = async () => {
		const state = await player.getCurrentState();
		if (!state) return;
		addEntry(state.position);
	};

	return (
		<div className="controls">
			<TrackTime />
			<button className="playback-button" onClick={handleSeekDir(-5000)}>
				<Icon name="fast_rewind" /> 5
			</button>
			<button className="playback-button" onClick={() => player.togglePlay()}>
				{paused ? <Icon name="play_arrow" /> : <Icon name="pause" />}
			</button>
			<button className="playback-button" onClick={handleSeekDir(5000)}>
				5 <Icon name="fast_forward" />
			</button>
			<button className="playback-button add-entry" onClick={handleAddEntry}>
				<Icon
					style={{ position: "relative", top: "1px" }}
					name="playlist_add"
				/>
			</button>
		</div>
	);
};

const TrackTime = () => {
	const [timeMs, setTimeMs] = useState(0);
	const player = usePlayer();

	useEffect(() => {
		const cb: OnTickCallback = (ms) => setTimeMs(ms);
		player.addOnTick(cb);
		return () => player.removeOnTick(cb);
	}, []);

	return <span className="time-display">{displayMs(timeMs)}</span>;
};
