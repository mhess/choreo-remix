import React, { useContext, useEffect, useState } from "react";
import {
	Button,
	Group,
	Text,
	Tooltip,
	useComputedColorScheme,
	useMantineColorScheme,
} from "@mantine/core";
import type { PolymorphicComponentProps, BoxProps } from "@mantine/core";
import {
	IconHelp,
	IconMoon,
	IconPlayerPause,
	IconPlayerPlay,
	IconPlaylistAdd,
	IconRewindBackward5,
	IconRewindForward5,
	IconSun,
} from "@tabler/icons-react";

import { EntriesContext } from "../lib/entries";
import { usePlayer } from "../lib/spotify";
import type { OnTickCallback } from "../lib/spotify";
import { displayMs, useMobileBreakpoint } from "../lib/utils";

import TooltipWithClick from "./TooltipWithClick";
import ThemedOutlineButton from "./ThemedOutlineButton";

import classes from "./Controls.module.css";

export default ({ help }: { help: Help }) => {
	const isMobile = useMobileBreakpoint();
	const { addEntry } = useContext(EntriesContext);
	const player = usePlayer();

	const handleAddEntry = async () => {
		const state = await player.getCurrentState();
		if (!state) return;
		addEntry(state.position);
	};

	return (
		<Group className={classes.controlBar}>
			<Group>
				<Group className={classes.desktopLeftSide}>
					<TrackTime />
					<PlaybackButtons visibleFrom="mobile" />
				</Group>
				<Button
					classNames={{ label: classes.btnLabel }}
					px="1.5rem"
					ml={!isMobile ? "md" : undefined}
					size={isMobile ? "md" : undefined}
					onClick={handleAddEntry}
					title="Add Entry"
				>
					<IconPlaylistAdd size="1.25rem" />
				</Button>
			</Group>
			<PlaybackButtons hiddenFrom="mobile" />
			<Group mt={isMobile ? "0.5rem" : undefined}>
				<HelpButton help={help} />
				<ToggleColorScheme />
			</Group>
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
		<TooltipWithClick label="Current track time">
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
			classNames={{ tooltip: classes.helpTooltip }}
			opened={isTooltipOpen}
			arrowSize={8}
			offset={10}
			multiline
			w={210}
			color="orange"
			label="First time here? Click below to toggle the help messages!"
		>
			<ThemedOutlineButton onClick={handleClick}>
				{help.isShowing ? "Hide" : "Show"} Help
				<IconHelp size="1.25rem" style={{ marginLeft: "0.25rem" }} />
			</ThemedOutlineButton>
		</Tooltip>
	);
};

const ToggleColorScheme = () => {
	const { toggleColorScheme } = useMantineColorScheme();
	const isLight = useComputedColorScheme() === "light";

	return (
		<Tooltip label="Toggle light/dark mode" w={173}>
			<ThemedOutlineButton onClick={toggleColorScheme}>
				{React.createElement(isLight ? IconSun : IconMoon, { size: "1.25rem" })}
			</ThemedOutlineButton>
		</Tooltip>
	);
};

const PlaybackButtons = (props: PolymorphicComponentProps<"div", BoxProps>) => {
	const isMobile = useMobileBreakpoint();
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

	const btnProps = {
		classNames: { label: classes.btnLabel },
		size: isMobile ? "md" : undefined,
	};

	return (
		<Group {...props} className={classes.playback}>
			<Button onClick={handleSeekDir(-5000)} title="Rewind 5 sec" {...btnProps}>
				<IconRewindBackward5 size="1.25rem" />
			</Button>
			<Button
				onClick={() => player.togglePlay()}
				title={paused ? "Play" : "Pause"}
				{...btnProps}
			>
				{React.createElement(paused ? IconPlayerPlay : IconPlayerPause, {
					size: "1rem",
				})}
			</Button>
			<Button
				onClick={handleSeekDir(5000)}
				title="Fast-forward 5 sec"
				{...btnProps}
			>
				<IconRewindForward5 size="1.25rem" />
			</Button>
		</Group>
	);
};
