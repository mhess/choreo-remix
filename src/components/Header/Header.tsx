import { useAtom } from "jotai";
import React, { useEffect, useState } from "react";
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

import {
	artistAtom,
	platformAtom,
	playerAtom,
	trackNameAtom,
} from "~/lib/platformAtoms";
import { spotifyAuthAtom } from "~/platforms/spotify";
import { videoIdAtom } from "~/platforms/youtube";
import { useIsMobile } from "~/lib/utils";

import TooltipWithClick from "~/components/TooltipWithClick";
import SelectPlatformButton from "./SelectPlatformButton";
import MenuDropdown from "./MenuDropdown";

import classes from "./Header.module.css";

export default function Header() {
	const [platform, setPlatform] = useAtom(platformAtom);
	const [ytVideoId] = useAtom(videoIdAtom);
	const [isLoggedIn] = useAtom(spotifyAuthAtom);
	const [player] = useAtom(playerAtom);
	const isMobile = useIsMobile();

	const isSpotify = platform === "spotify";
	const shouldShowActions =
		player ||
		(isLoggedIn && isSpotify) ||
		(platform === "youtube" && !!ytVideoId);

	return (
		<Group component="header" className={classes.header}>
			<Group className={classes.headerLeftSide}>
				<Text
					role="button"
					onClick={() => setPlatform("landing")}
					className={classes.logo}
					span
				>
					Choreo
				</Text>
				{player && <TrackInfo />}
			</Group>
			<Group
				className={classes.headerRightSide}
				justify={isSpotify && player ? "space-between" : "right"}
			>
				{shouldShowActions && (
					<>
						{isSpotify && <SpotifyChangeButton />}
						{!isMobile && (
							<Box>
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
									<MenuDropdown />
								</Menu>
							</Box>
						)}
					</>
				)}
			</Group>
			<Group gap="xs">
				{!isMobile && <SelectPlatformButton />}
				{!isMobile && <ToggleColorScheme />}
				{isMobile && <BurgerMenu />}
			</Group>
		</Group>
	);
}

const TrackInfo = () => {
	const [artist] = useAtom(artistAtom);
	const [trackName] = useAtom(trackNameAtom);

	return (
		<Text className={classes.trackInfo} span>
			{artist.length > 0 && (
				<>
					<Text fw={700} span>
						{artist}
					</Text>
					:{" "}
				</>
			)}
			{trackName}
		</Text>
	);
};

const SpotifyChangeButton = () => {
	const [player] = useAtom(playerAtom);

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

const BurgerMenu = () => {
	const [opened, { toggle, close }] = useDisclosure(false);

	return (
		<Menu onClose={close}>
			<Menu.Target>
				<Burger opened={opened} aria-label="Toggle menu" onClick={toggle} />
			</Menu.Target>
			<MenuDropdown />
		</Menu>
	);
};

const ToggleColorScheme = () => {
	const [canRenderIcon, setCanRenderIcon] = useState(false);
	const { toggleColorScheme } = useMantineColorScheme();
	const isLight = useComputedColorScheme() === "light";

	useEffect(() => {
		// Icon can only be rendered on browser because server doesn't have access
		// to scheme state in localStorage
		setCanRenderIcon(true);
	}, []);

	return (
		<Tooltip label="Toggle light/dark mode" w={173}>
			<Button
				aria-label="Toggle light/dark mode"
				variant="outline"
				onClick={toggleColorScheme}
			>
				{canRenderIcon ? (
					React.createElement(isLight ? IconSun : IconMoon, { size: "1.25rem" })
				) : (
					<Box w="1.25rem" />
				)}
			</Button>
		</Tooltip>
	);
};
