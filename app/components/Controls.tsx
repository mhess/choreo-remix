import { useContext, useEffect, useState } from "react";
import { Button, Group, Text } from "@mantine/core";

import { EntriesContext } from "../lib/entries";
import { usePlayer } from "../lib/spotify";
import type { OnTickCallback } from "../lib/spotify";
import { displayMs } from "../lib/utils";

import Icon from "./Icon";
import classes from "./Controls.module.css";

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
		<Group className={classes.controls}>
			<TrackTime />
			<Button
				classNames={{ label: classes.btnLabel }}
				onClick={handleSeekDir(-5000)}
				title="Rewind 5 sec"
			>
				<Icon name="fast_rewind" /> 5
			</Button>
			<Button
				classNames={{ label: classes.btnLabel }}
				onClick={() => player.togglePlay()}
				title={paused ? "Play" : "Pause"}
			>
				{paused ? <Icon name="play_arrow" /> : <Icon name="pause" />}
			</Button>
			<Button
				classNames={{ label: classes.btnLabel }}
				onClick={handleSeekDir(5000)}
				title="Fast-forward 5 sec"
			>
				5 <Icon name="fast_forward" />
			</Button>
			<Button
				classNames={{ label: classes.btnLabel }}
				ml="md"
				onClick={handleAddEntry}
				title="Add Entry"
			>
				<Icon
					style={{ position: "relative", top: "1px" }}
					name="playlist_add"
				/>
			</Button>
		</Group>
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

	return (
		<Text span className={classes.timeDisplay}>
			{displayMs(timeMs)}
		</Text>
	);
};
