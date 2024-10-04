import { useRef, createElement, Fragment, type ReactElement } from "react";
import {
	Group,
	Menu,
	useComputedColorScheme,
	useMantineColorScheme,
} from "@mantine/core";
import { useAtom } from "jotai";
import { IconMoon, IconSun } from "@tabler/icons-react";

import { useIsMobile } from "~/lib/utils";
import { platformAtom, playerAtom, trackNameAtom } from "~/lib/platformAtoms";
import { spotifyAuthAtom } from "~/platforms/spotify";
import { videoIdAtom } from "~/platforms/youtube";

import PlatformItems from "./PlatformItems";

import classes from "./MenuDropdown.module.css";
import { audioFileAtom } from "~/platforms/audioFile";
import { entryAtomsForPlatformAtom } from "~/lib/entries";

export default function MenuDropdown() {
	const [{ clearAtom, saveToCSVAtom, loadFromCSVAtom }] = useAtom(
		entryAtomsForPlatformAtom,
	);
	const [, clear] = useAtom(clearAtom);
	const [, saveToCSV] = useAtom(saveToCSVAtom);
	const [, loadFromCSV] = useAtom(loadFromCSVAtom);

	const [ytVideoId, setYtVideoId] = useAtom(videoIdAtom);
	const [isSpotifyLoggedIn, logoutSpotify] = useAtom(spotifyAuthAtom);
	const [, setAudioFile] = useAtom(audioFileAtom);

	const [trackName] = useAtom(trackNameAtom);
	const [platform] = useAtom(platformAtom);
	const [player] = useAtom(playerAtom);
	const { toggleColorScheme } = useMantineColorScheme();
	const isLight = useComputedColorScheme() === "light";
	const isMobile = useIsMobile();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleSaveCSV = () => {
		const formattedTrackName = (trackName as string)
			.toLocaleLowerCase()
			.replaceAll(" ", "_");
		saveToCSV(formattedTrackName);
	};

	const handleClickLoad = () => fileInputRef.current?.click();

	const handleLoadCSV = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
		const file = target?.files?.[0];
		if (!file) return alert("No file was selected :(");
		if (file.type !== "text/csv")
			return alert(`File must be of type "text/csv"`);
		loadFromCSV(file);
	};

	const entriesGroup = player && (
		<Fragment key="entries">
			<Menu.Item onClick={handleClickLoad}>Load entries from CSV</Menu.Item>
			<Menu.Item onClick={handleSaveCSV}>Save entries to CSV</Menu.Item>
			<Menu.Item onClick={clear}>Clear entries</Menu.Item>
		</Fragment>
	);

	const platformGroup = isMobile && <PlatformItems key="platform" />;

	const youTubeGroup = ytVideoId && platform === "youtube" && (
		<Menu.Item key="change-yt" onClick={() => setYtVideoId(null)}>
			Change YouTube Video
		</Menu.Item>
	);

	const spotifyLogoutGroup = isSpotifyLoggedIn && platform === "spotify" && (
		<Menu.Item key="log-out" onClick={logoutSpotify}>
			Log Out of Spotify
		</Menu.Item>
	);

	const audioFileGroup = player && platform === "audioFile" && (
		<Menu.Item key="change-file" onClick={() => setAudioFile()}>
			Change Audio File
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
		spotifyLogoutGroup,
		youTubeGroup,
		audioFileGroup,
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
			<label htmlFor="csv-upload" className={classes.fileInputLabel}>
				Upload CSV
				<input
					id="csv-upload"
					ref={fileInputRef}
					type="file"
					onChange={handleLoadCSV}
				/>
			</label>
			<Menu.Dropdown>{groupsWithDividers}</Menu.Dropdown>
		</>
	);
}
