import { Menu } from "@mantine/core";
import { useAtom } from "jotai";
import type { ReactNode } from "react";

import { type Platform, platformAtom } from "~/lib/atoms";

import { Spotify, YouTube } from "../Logos";

export default () => {
	const [platform, setPlatform] = useAtom(platformAtom);

	return (
		<>
			<Menu.Label>Switch to</Menu.Label>
			{platform !== "spotify" && (
				<Menu.Item
					leftSection={logoByPlatform.spotify}
					onClick={() => setPlatform("spotify")}
				>
					Spotify
				</Menu.Item>
			)}
			{platform !== "youtube" && (
				<Menu.Item
					leftSection={logoByPlatform.youtube}
					onClick={() => setPlatform("youtube")}
				>
					YouTube
				</Menu.Item>
			)}
		</>
	);
};

export const logoByPlatform: Record<Platform, ReactNode> = {
	spotify: <Spotify />,
	youtube: <YouTube />,
	landing: undefined,
};
