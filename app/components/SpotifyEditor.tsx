import { Center, Stack, Text } from "@mantine/core";
import { Link } from "@remix-run/react";

import { SpotifyPlayerStatus, useSpotifyPlayer } from "~/lib/spotify";

import Entries from "./Entries";
import Loading from "./Loading";

export default () => {
	const status = useSpotifyPlayer();

	if (status === SpotifyPlayerStatus.LOGGED_OUT)
		return (
			<Center h="100%">
				<Text>
					Please <Link to="auth/login">log&nbsp;in</Link> to your spotify
					premium account.
				</Text>
			</Center>
		);

	return status === SpotifyPlayerStatus.READY ? (
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

const messageByStatus: Record<
	Exclude<SpotifyPlayerStatus, "loggedOut" | "ready">,
	React.ReactNode
> = {
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
