import { createElement, Fragment, type ReactElement } from "react";
import {
	Box,
	Group,
	Menu,
	useComputedColorScheme,
	useMantineColorScheme,
} from "@mantine/core";
import { useAtom } from "jotai";
import { IconMoon, IconSun } from "@tabler/icons-react";

import { useMobileBreakpoint } from "~/lib/utils";
import { platformAtom, playerAtom, trackNameAtom } from "~/lib/atoms";
import { useEntriesData } from "~/lib/entries";
import { spotifyTokenAtom } from "~/lib/spotify";
import { youTubeClearVideoId } from "~/lib/youtube";

import PlatformItems from "./PlatformItems";

import classes from "./MenuDropdown.module.css";

export default () => {
	const { saveToCSV, loadFromCSV, clear } = useEntriesData();
	const [trackName] = useAtom(trackNameAtom);
	const [spotifyToken, setSpotifyToken] = useAtom(spotifyTokenAtom);
	const [platform] = useAtom(platformAtom);
	const [player] = useAtom(playerAtom);
	const { toggleColorScheme } = useMantineColorScheme();
	const isLight = useComputedColorScheme() === "light";
	const isMobile = useMobileBreakpoint();

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

	const entriesGroup = player && (
		<Fragment key="entries">
			<Menu.Item>
				<Box
					className={classes.loadLabel}
					component="label"
					htmlFor="csv-upload"
				>
					Load entries from CSV
				</Box>
			</Menu.Item>
			<Menu.Item onClick={handleSaveCSV}>Save entries to CSV</Menu.Item>
			<Menu.Item onClick={clear}>Clear entries</Menu.Item>
		</Fragment>
	);

	const platformGroup = isMobile && <PlatformItems key="platform" />;

	const youTubeGroup = player && platform === "youtube" && (
		<Menu.Item key="change-yt" onClick={youTubeClearVideoId}>
			Change YouTube Video
		</Menu.Item>
	);

	const spotifyLogoutGroup = spotifyToken && platform === "spotify" && (
		<Menu.Item key="log-out" onClick={() => setSpotifyToken(null)}>
			Log Out of Spotify
		</Menu.Item>
	);

	const lightDarkGroup = isMobile && (
		<Menu.Item key="color-scheme" onClick={toggleColorScheme}>
			<Group gap="0.25rem">
				{createElement(isLight ? IconSun : IconMoon, { size: "1.25rem" })}{" "}
				Toggle light/dark
			</Group>
		</Menu.Item>
	);

	const groupsToRender = [
		entriesGroup,
		platformGroup,
		youTubeGroup,
		spotifyLogoutGroup,
		lightDarkGroup,
	].filter(Boolean) as ReactElement[];

	const groupsWithDividers = groupsToRender.reduce(
		(output, el, index, groups) => {
			output.push(el);
			if (index < groups.length - 1)
				// biome-ignore lint/suspicious/noArrayIndexKey: an element with the same key will be the same element
				output.push(<Menu.Divider key={`div-${index}`} />);
			return output;
		},
		[] as ReactElement[],
	);

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
			<Menu.Dropdown>{groupsWithDividers}</Menu.Dropdown>
		</>
	);
};
