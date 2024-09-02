import { useContext, useEffect, useState } from "react";
import { Button, Group, Text, Tooltip } from "@mantine/core";

import { EntriesContext } from "../lib/entries";
import { usePlayer } from "../lib/spotify";
import type { OnTickCallback } from "../lib/spotify";
import { displayMs } from "../lib/utils";

import TooltipWithClick from "./TooltipWithClick";
import Icon from "./Icon";

import classes from "./Controls.module.css";

export default ({ help }: { help: Help }) => {
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
		<Group className={classes.controlBar}>
			<Group className={classes.controls}>
				<Group className={classes.playback}>
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
				</Group>
				<Button
					classNames={{ label: classes.btnLabel }}
					px="1.5rem"
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
			<HelpButton help={help} />
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
		<TooltipWithClick label="Current Track Time">
			<Text span className={classes.timeDisplay}>
				{displayMs(timeMs)}
			</Text>
		</TooltipWithClick>
	);
};

const LS_NO_HELP_KEY = "autoHelp";

const HelpButton = ({ help }: { help: Help }) => {
	const [isTooltipOpen, setIsTooltipOpen] = useState(false);

	const handleClick = () => {
		if (isTooltipOpen) localStorage.setItem(LS_NO_HELP_KEY, "true");
		setIsTooltipOpen(false);
		help.toggle();
	};

	useEffect(() => {
		const noHelp = !!localStorage.getItem(LS_NO_HELP_KEY);
		if (!noHelp) setIsTooltipOpen(true);
	}, []);

	return (
		<Tooltip
			className={classes.helpTooltip}
			opened={isTooltipOpen}
			arrowSize={8}
			offset={10}
			multiline
			w={210}
			color="orange"
			label="First time here? Click below to toggle the help messages!"
		>
			<Button
				variant="outline"
				color="var(--app-font-color)"
				onClick={handleClick}
			>
				{help.isShowing ? "Hide" : "Show"} Help{" "}
				<Icon
					name="help"
					style={{ fontSize: "1.25rem", marginLeft: "0.25rem" }}
				/>
			</Button>
		</Tooltip>
	);
};
