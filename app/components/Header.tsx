import { atom, useAtom } from "jotai";
import React from "react";
import {
	Box,
	Burger,
	Button,
	Group,
	Menu,
	Text,
	Tooltip,
	useComputedColorScheme,
	useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconMoon, IconSun } from "@tabler/icons-react";

import { useEntriesData } from "~/lib/entries";
import { platformAtom, playerAtom } from "~/lib/atoms";
import type { Platform } from "~/lib/atoms";
import {
	spotifyPlaybackStateAtom,
	spotifyPlayerAtom,
} from "~/lib/spotify/player";
import { spotifyTokenAtom } from "~/lib/spotify/auth";
import { youTubeVideoIdAtom } from "~/lib/youtube";

import TooltipWithClick from "./TooltipWithClick";

import classes from "./Header.module.css";

const trackNameAtom = atom((get) =>
	get(platformAtom) === "spotify"
		? get(spotifyPlaybackStateAtom)?.track_window.current_track.name
		: "youtube_track",
);

export default () => {
	const [platform] = useAtom(platformAtom);
	const [player] = useAtom(playerAtom);
	const entries = useEntriesData();

	const isSpotify = platform === "spotify";
	const isPlayerReady = !!player;

	return (
		<Group component="header" className={classes.header}>
			<Group className={classes.headerLeftSide}>
				<Text className={classes.logo} span>
					Choreo
				</Text>
				{isPlayerReady && isSpotify && <SpotifyTrackInfo />}
			</Group>
			<Group
				className={classes.headerRightSide}
				justify={isSpotify ? "space-between" : "right"}
			>
				{isPlayerReady && (
					<>
						{isSpotify && <SpotifyChangeButton />}
						{entries && (
							<Box visibleFrom="mobile">
								<Menu trigger="hover">
									<Menu.Target>
										<Button variant="outline" className={classes.actions}>
											Actions
											<IconChevronDown
												size="1.25rem"
												style={{ transform: "translateY(0.125rem)" }}
											/>
										</Button>
									</Menu.Target>
									<ActionsMenuDropdown />
								</Menu>
							</Box>
						)}
					</>
				)}
			</Group>
			<Group gap="xs">
				<SelectPlaformButton />
				<ToggleColorScheme />
				{entries && <BurgerMenu />}
			</Group>
		</Group>
	);
};

const SpotifyTrackInfo = () => {
	const [state] = useAtom(spotifyPlaybackStateAtom);
	const track = state?.track_window.current_track;

	const artists = track?.artists.map(({ name }) => name).join(", ");

	return (
		track && (
			<Text className={classes.trackInfo} span>
				<Text fw={700} span>
					{artists}
				</Text>
				: {track.name}
			</Text>
		)
	);
};

const SpotifyChangeButton = () => {
	const [player] = useAtom(spotifyPlayerAtom);

	return !player ? null : (
		<TooltipWithClick
			ta="center"
			w={225}
			multiline
			label="Use a Spotify desktop or mobile app to change the track."
		>
			<Button variant="outline" className={classes.changeTrack}>
				Change?
			</Button>
		</TooltipWithClick>
	);
};

const ActionsMenuDropdown = () => {
	const { saveToCSV, loadFromCSV, clear } = useEntriesData();
	const [trackName] = useAtom(trackNameAtom);
	const [spotifyToken, setSpotifyToken] = useAtom(spotifyTokenAtom);
	const [platform] = useAtom(platformAtom);
	const [ytVideoId, setYtVideoId] = useAtom(youTubeVideoIdAtom);

	const handleSaveCSV = () => {
		const formattedTrackName = (trackName as string)
			.toLocaleLowerCase()
			.replaceAll(" ", "_");
		saveToCSV(formattedTrackName);
	};

	const handleLoadCSV = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
		const file = target?.files?.[0];
		if (!file) return alert("No file was selected :(");
		if (file.type !== "text/csv") alert(`File must be of type "text/csv"`);
		loadFromCSV(file);
	};

	return (
		<>
			{/* This input must still be rendered even after the menu dropdown closes
			  in order for the onChange callback to get invoked */}
			<input
				className={classes.fileInput}
				id="csv-upload"
				type="file"
				onChange={handleLoadCSV}
			/>
			<Menu.Dropdown>
				{!!trackName && (
					<>
						<Menu.Item>
							<Box
								className={classes.loadLabel}
								component="label"
								htmlFor="csv-upload"
							>
								Load from CSV
							</Box>
						</Menu.Item>
						<Menu.Item onClick={handleSaveCSV}>Save to CSV</Menu.Item>
						<Menu.Item onClick={clear}>Clear</Menu.Item>
						{platform === "youtube" && ytVideoId && (
							<Menu.Item onClick={() => setYtVideoId(null)}>
								Change YouTube Video
							</Menu.Item>
						)}
					</>
				)}
				{spotifyToken && (
					<Menu.Item onClick={() => setSpotifyToken(null)}>
						Log Out of Spotify
					</Menu.Item>
				)}
			</Menu.Dropdown>
		</>
	);
};

const BurgerMenu = () => {
	const [opened, { toggle, close }] = useDisclosure(false);

	return (
		<Menu onClose={close}>
			<Menu.Target>
				<Burger opened={opened} onClick={toggle} hiddenFrom="mobile" />
			</Menu.Target>
			<ActionsMenuDropdown />
		</Menu>
	);
};

const ToggleColorScheme = () => {
	const { toggleColorScheme } = useMantineColorScheme();
	const isLight = useComputedColorScheme() === "light";

	return (
		<Tooltip label="Toggle light/dark mode" w={173}>
			<Button variant="outline" onClick={toggleColorScheme}>
				{React.createElement(isLight ? IconSun : IconMoon, { size: "1.25rem" })}
			</Button>
		</Tooltip>
	);
};

const nameByPlatform: Record<Exclude<Platform, "landing">, string> = {
	spotify: "Spotify",
	youtube: "Youtube",
};

const SelectPlaformButton = () => {
	const [platform, setPlatform] = useAtom(platformAtom);

	const content =
		platform === "landing" ? "Select Platform" : nameByPlatform[platform];

	return (
		<Menu>
			<Menu.Target>
				<Button visibleFrom="mobile" variant="outline">
					{content}
				</Button>
			</Menu.Target>
			<Menu.Dropdown>
				{platform !== "spotify" && (
					<Menu.Item onClick={() => setPlatform("spotify")}>Spotify</Menu.Item>
				)}
				{platform !== "youtube" && (
					<Menu.Item onClick={() => setPlatform("youtube")}>Youtube</Menu.Item>
				)}
			</Menu.Dropdown>
		</Menu>
	);
};
