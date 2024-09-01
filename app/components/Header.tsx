import { useContext, useEffect, useState } from "react";
import { Box, Burger, Button, Group, Menu, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import type { WrappedPlayer } from "~/lib/spotify";
import { EntriesContext } from "~/lib/entries";
import { MOBILE_BREAKPOINT } from "~/lib/utils";

import TooltipWithClick from "./TooltipWithClick";
import Icon from "./Icon";

import classes from "./Header.module.css";

export default ({
	player,
	logout,
}: {
	player: WrappedPlayer | undefined;
	logout: () => void;
}) => {
	const [track, setTrack] = useState<Spotify.Track>();

	useEffect(() => {
		if (!player) return;

		const cb: Spotify.PlaybackStateListener = ({ track_window }) =>
			setTrack(track_window.current_track);
		player.addOnStateChange(cb);
		return () => player.removeOnStateChange(cb);
	}, [player]);

	const artists = track?.artists.map(({ name }) => name).join(", ");

	return (
		<Group component="header" className={classes.header}>
			<Group className={classes.headerLeftSide}>
				<Text className={classes.logo} span>
					Choreo
				</Text>
				{track && (
					<Text className={classes.trackInfo} span>
						<Text fw={700} span>
							{artists}
						</Text>
						: {track.name}
					</Text>
				)}
			</Group>
			<Group className={classes.headerRightSide}>
				{track && (
					<>
						<TooltipWithClick label="Use a the Spotify desktop or mobile app to change the track.">
							<Button
								className={classes.changeTrack}
								variant="outline"
								color="var(--mantine-color-gray-7)"
							>
								Change?
							</Button>
						</TooltipWithClick>
						<Box visibleFrom={MOBILE_BREAKPOINT}>
							<Menu trigger="hover">
								<Menu.Target>
									<Button
										className={classes.actions}
										variant="outline"
										color="var(--mantine-color-gray-7)"
									>
										Actions
										<Icon
											name="keyboard_arrow_down"
											className={classes.chevronIcon}
										/>
									</Button>
								</Menu.Target>
								<MenuDropdown trackName={track.name} />
							</Menu>
						</Box>
					</>
				)}
			</Group>
			<Button visibleFrom={MOBILE_BREAKPOINT} onClick={logout}>
				Log Out
			</Button>
			<BurgerMenu trackName={track?.name} logout={logout} />
		</Group>
	);
};

const MenuDropdown = ({
	trackName,
	logout,
}: { trackName?: string; logout?: () => void }) => {
	const { saveToCSV, loadFromCSV, clear } = useContext(EntriesContext);

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
							<Text
								className="cursor-pointer"
								size="sm"
								component="label"
								htmlFor="csv-upload"
							>
								Load from CSV
							</Text>
						</Menu.Item>
						<Menu.Item onClick={handleSaveCSV}>Save to CSV</Menu.Item>
						<Menu.Item onClick={clear}>Clear</Menu.Item>
					</>
				)}
				{logout && <Menu.Item onClick={logout}>Log Out</Menu.Item>}
			</Menu.Dropdown>
		</>
	);
};

const BurgerMenu = ({
	trackName,
	logout,
}: { trackName?: string; logout: () => void }) => {
	const [opened, { toggle, close }] = useDisclosure(false);

	return (
		<Menu onClose={close}>
			<Menu.Target>
				<Burger
					opened={opened}
					onClick={toggle}
					hiddenFrom={MOBILE_BREAKPOINT}
				/>
			</Menu.Target>
			<MenuDropdown trackName={trackName} logout={logout} />
		</Menu>
	);
};
