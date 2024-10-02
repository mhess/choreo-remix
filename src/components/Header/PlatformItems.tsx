import { Menu } from "@mantine/core";
import { useAtom } from "jotai";
import type { ReactNode } from "react";

import { type Platform, platformAtom } from "~/lib/platformAtoms";

import { AudioFile, Spotify, YouTube } from "../Logos";

export default function PlatformItems() {
	const [platform, setPlatform] = useAtom(platformAtom);

	return (
		<>
			<Menu.Label>Switch to</Menu.Label>
			{platform !== "spotify" && (
				<Menu.Item
					leftSection={logoByPlatform.spotify}
					onClick={() => setPlatform("spotify")}
				>
					{labelByPlatform.spotify}
				</Menu.Item>
			)}
			{platform !== "youtube" && (
				<Menu.Item
					leftSection={logoByPlatform.youtube}
					onClick={() => setPlatform("youtube")}
				>
					{labelByPlatform.youtube}
				</Menu.Item>
			)}
			{platform !== "audioFile" && (
				<Menu.Item
					leftSection={logoByPlatform.audioFile}
					onClick={() => setPlatform("audioFile")}
				>
					{labelByPlatform.audioFile}
				</Menu.Item>
			)}
		</>
	);
}

export const logoByPlatform: Record<Platform, ReactNode> = {
	spotify: <Spotify />,
	youtube: <YouTube />,
	audioFile: <AudioFile />,
	landing: undefined,
};

export const labelByPlatform: Record<Platform, string> = {
	spotify: "Spotify",
	youtube: "YouTube",
	audioFile: "Audio File",
	landing: "Select Platform",
};
