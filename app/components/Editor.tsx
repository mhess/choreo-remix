import { useEffect, useContext } from "react";
import type { RefObject } from "react";
import { Box, Center, Text } from "@mantine/core";
import { Link } from "@remix-run/react";

import { useSpotifyPlayer, PlayerContext, PlayerStatus } from "../lib/spotify";
import type { SpotifyAuthToken } from "../lib/spotify";
import { EntriesContext, useEntries } from "../lib/entries";

import classes from "./Editor.module.css";
import Loading from "./Loading";
import Header from "./Header";
import Controls from "./Controls";
import Entry from "./Entry";

export default ({ token }: { token: SpotifyAuthToken }) => {
	const { player, status } = useSpotifyPlayer(token);
	const isPlayerReady = status === PlayerStatus.READY && !!player;
	const entries = useEntries(player);

	return (
		<EntriesContext.Provider value={entries}>
			<Header player={player} logout={token.reset} />
			{isPlayerReady ? (
				<PlayerContext.Provider value={player}>
					<Entries />
				</PlayerContext.Provider>
			) : (
				<Center className="h-full">{messageByStatus[status]}</Center>
			)}
		</EntriesContext.Provider>
	);
};

const Entries = () => {
	const player = useContext(PlayerContext);
	const { entries, scrollerRef } = useContext(EntriesContext);

	useEffect(
		() => () => {
			player.pause();
		},
		[],
	);

	return (
		<>
			<Box
				className={classes.entries}
				ref={scrollerRef as RefObject<HTMLDivElement>}
			>
				{entries.map((entry, index) => (
					<Entry key={entry.timeMs} index={index} />
				))}
			</Box>
			<Controls />
		</>
	);
};

const TryAgain = ({ message }: { message: string }) => (
	<Text>
		{message} Would you like to try to <Link to="auth/login">log in</Link>{" "}
		again?
	</Text>
);

const messageByStatus: Record<PlayerStatus, React.ReactNode> = {
	[PlayerStatus.READY]: "shouldn't happen!",
	[PlayerStatus.LOADING]: <Loading message="Connecting to Spotify" />,
	[PlayerStatus.NOT_CONNECTED]: `Please connect to the "Choreo" device on your Spotify player`,
	[PlayerStatus.PLAYBACK_ERROR]: (
		<TryAgain message="There was an error with playback." />
	),
	[PlayerStatus.INIT_ERROR]: <TryAgain message="Initialization Failed." />,
	[PlayerStatus.ACCT_ERROR]: (
		<TryAgain message="There was a problem with your account. Spotify requires a premium account for application access." />
	),
	[PlayerStatus.AUTH_ERROR]: <TryAgain message="Could not authorize access." />,
};
