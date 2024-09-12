import { useAtom } from "jotai";
import { useEffect } from "react";
import { Center, Container, Stack, Text } from "@mantine/core";
import { Link } from "@remix-run/react";

import {
	SpotifyPlayerStatus,
	spotifyPlayerAtom,
	useSpotifyPlayer,
} from "~/lib/spotify/player";
import { spotifyTokenAtom } from "~/lib/spotify/auth";

import Entries from "./Entries";
import Loading from "./Loading";
import { playerAtom } from "~/lib/atoms";

export default () => {
	const [token] = useAtom(spotifyTokenAtom);
	const { status, player: spotifyPlayer } = useSpotifyPlayer(token);
	const [, setSpotifyPlayer] = useAtom(spotifyPlayerAtom);
	const [player] = useAtom(playerAtom);

	useEffect(() => {
		setSpotifyPlayer(spotifyPlayer);
	}, [spotifyPlayer, setSpotifyPlayer]);

	if (!token)
		return (
			<Center h="100%">
				<Text>
					Please <Link to="auth/login">log&nbsp;in</Link> to your spotify
					premium account.
				</Text>
			</Center>
		);

	const isPlayerReady = status === SpotifyPlayerStatus.READY && player;

	return isPlayerReady ? (
		<Entries />
	) : (
		<Center mx="1rem" h="100%">
			{messageByStatus[status]}
		</Center>
	);
};

const TryAgain = ({ message }: { message: string }) => (
	<Text>
		{message} Would you like to try to <Link to="auth/login">log&nbsp;in</Link>{" "}
		to Spotify again?
	</Text>
);

const messageByStatus: Record<SpotifyPlayerStatus, React.ReactNode> = {
	[SpotifyPlayerStatus.READY]: "shouldn't happen!",
	[SpotifyPlayerStatus.LOADING]: <Loading message="Connecting to Spotify" />,
	[SpotifyPlayerStatus.NOT_CONNECTED]: (
		<Stack align="center">
			<Text>
				Please connect to the "Choreo Player" device on your Spotify player.
			</Text>
			<Text>
				Ensure that your other device is on the same network as this one.
			</Text>
			<Text>
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
		</Stack>
	),
	[SpotifyPlayerStatus.PLAYBACK_ERROR]: (
		<TryAgain message="There was an error with playback." />
	),
	[SpotifyPlayerStatus.INIT_ERROR]: (
		<TryAgain message="Initialization Failed." />
	),
	[SpotifyPlayerStatus.ACCT_ERROR]: (
		<TryAgain message="There was a problem with your account. Spotify requires a premium account for application access." />
	),
	[SpotifyPlayerStatus.AUTH_ERROR]: (
		<TryAgain message="Could not authorize access." />
	),
};
