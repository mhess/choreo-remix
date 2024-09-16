import React, { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { Button, Group, Text, Tooltip } from "@mantine/core";
import type { PolymorphicComponentProps, BoxProps } from "@mantine/core";
import {
	IconHelp,
	IconPlayerPause,
	IconPlayerPlay,
	IconPlaylistAdd,
	IconRewindBackward5,
	IconRewindForward5,
} from "@tabler/icons-react";

import type { OnTickCallback } from "~/lib/player";
import { displayMs, useMobileBreakpoint } from "~/lib/utils";
import { playerPausedAtom, useEstablishedPlayer } from "~/lib/atoms";
import { entryAtomsForPlatform } from "~/lib/entries";

import TooltipWithClick from "./TooltipWithClick";

import classes from "./Controls.module.css";

export default ({ help }: { help: Help }) => {
	const isMobile = useMobileBreakpoint();
	const [{ addAtom }] = useAtom(entryAtomsForPlatform);
	const [, addEntry] = useAtom(addAtom);
	const player = useEstablishedPlayer();

	const handleAddEntry = async () => {
		const timeMs = await player.getCurrentTime();
		addEntry(timeMs);
	};

	return (
		<Group className={classes.controlBar} role="toolbar" aria-label="Controls">
			<Group>
				<Group className={classes.desktopLeftSide}>
					<TrackTime />
					{!isMobile && <PlaybackButtons />}
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
			{isMobile && <PlaybackButtons hiddenFrom="mobile" />}
			<Group mt={isMobile ? "0.5rem" : undefined}>
				<HelpButton help={help} />
			</Group>
		</Group>
	);
};

const TrackTime = () => {
	const [timeMs, setTimeMs] = useState(0);
	const player = useEstablishedPlayer();

	useEffect(() => {
		const cb: OnTickCallback = (ms) => setTimeMs(ms);
		player.addOnTick(cb);
		return () => player.removeOnTick(cb);
	}, [player]);

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
			<Button variant="outline" onClick={handleClick}>
				{help.isShowing ? "Hide" : "Show"} Help
				<IconHelp size="1.25rem" style={{ marginLeft: "0.25rem" }} />
			</Button>
		</Tooltip>
	);
};

const PlaybackButtons = (props: PolymorphicComponentProps<"div", BoxProps>) => {
	const isMobile = useMobileBreakpoint();
	const player = useEstablishedPlayer();
	const [paused] = useAtom(playerPausedAtom);

	const handleSeekDir = (ms: number) => async () => {
		const time = await player.getCurrentTime();
		player.seekTo(ms + time);
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
				onClick={() => player[paused ? "play" : "pause"]()}
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
