import { useEffect, useContext } from "react";
import type { MutableRefObject } from "react";
import { Box, Center, Container, Group, Text } from "@mantine/core";
import { Link } from "@remix-run/react";
import { useDisclosure } from "@mantine/hooks";

import { useSpotifyPlayer, PlayerContext, PlayerStatus } from "~/lib/spotify";
import type { SpotifyAuthToken } from "../lib/spotify";
import { EntriesContext, useEntries } from "../lib/entries";

import classes from "./Editor.module.css";
import Loading from "./Loading";
import Header from "./Header";
import Controls from "./Controls";
import Entry from "./Entry";
import Help from "./Help";

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
				<Center mx="1rem" h="100%">
					{messageByStatus[status]}
				</Center>
			)}
		</EntriesContext.Provider>
	);
};

const Entries = () => {
	const player = useContext(PlayerContext);
	const { entries, scrollerRef, containerRef } = useContext(EntriesContext);
	const [isHelpOpen, { toggle }] = useDisclosure(false);

	useEffect(
		() => () => {
			player.pause();
		},
		[],
	);

	return (
		<>
			{isHelpOpen && <EntryHeader />}
			<Box
				className={classes.entries}
				pos="relative"
				style={{ paddingBottom: isHelpOpen ? 0 : "2rem" }}
				ref={scrollerRef as MutableRefObject<HTMLDivElement>}
			>
				{!isHelpOpen && <EntryHeader />}
				<Box ref={containerRef as MutableRefObject<HTMLDivElement>}>
					{entries.map(({ timeMs }, index) => (
						<Entry key={timeMs} index={index} />
					))}
				</Box>
				{isHelpOpen && (
					<Help scrollerRef={scrollerRef} containerRef={containerRef} />
				)}
			</Box>
			<Controls help={{ isShowing: isHelpOpen, toggle }} />
		</>
	);
};

const EntryHeader = () => (
	<Group className={classes.entryHeader}>
		<Text className={classes.count}>count</Text>
		<Text className={classes.timestamp}>timestamp</Text>
		<Text pl="sm">note</Text>
	</Group>
);

const TryAgain = ({ message }: { message: string }) => (
	<Text>
		{message} Would you like to try to <Link to="auth/login">log in</Link>{" "}
		again?
	</Text>
);

const messageByStatus: Record<PlayerStatus, React.ReactNode> = {
	[PlayerStatus.READY]: "shouldn't happen!",
	[PlayerStatus.LOADING]: <Loading message="Connecting to Spotify" />,
	[PlayerStatus.NOT_CONNECTED]: (
		<Container className="text-center" size="xs">
			<Text>
				Please connect to the "Choreo Player" device on your Spotify player.
				Ensure that your other device is on the same network as this one.
			</Text>
			<Text mt="sm">
				See this{" "}
				<a
					href="https://support.spotify.com/us/article/spotify-connect/"
					rel="noreferrer"
					target="_blank"
				>
					article
				</a>{" "}
				if you're having trouble.
			</Text>
		</Container>
	),
	[PlayerStatus.PLAYBACK_ERROR]: (
		<TryAgain message="There was an error with playback." />
	),
	[PlayerStatus.INIT_ERROR]: <TryAgain message="Initialization Failed." />,
	[PlayerStatus.ACCT_ERROR]: (
		<TryAgain message="There was a problem with your account. Spotify requires a premium account for application access." />
	),
	[PlayerStatus.AUTH_ERROR]: <TryAgain message="Could not authorize access." />,
};
