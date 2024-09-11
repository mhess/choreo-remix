import { useEffect, useRef, useState } from "react";
import { useAtom } from "jotai";
import {
	Button,
	Center,
	Container,
	Stack,
	Text,
	useComputedColorScheme,
	useMantineTheme,
} from "@mantine/core";

import {
	extractVideoIdFromUrl,
	useYouTubePlayer,
	YouTubePlayerStatus,
	youTubePlayerStatusAtom,
	youTubeVideoIdAtom,
	type YouTubePlayer,
} from "~/lib/youtube";

import TextInputWithState from "./TextInputWithState";
import Loading from "./Loading";
import Entries from "./Entries";

export default () => {
	const player = useYouTubePlayer();
	const [status] = useAtom(youTubePlayerStatusAtom);
	const [videoId] = useAtom(youTubeVideoIdAtom);

	useEffect(() => {
		if (player && videoId && status !== YouTubePlayerStatus.LOADING)
			player.cueVideoById(videoId);
	}, [player, videoId, status]);

	if (videoId && status === YouTubePlayerStatus.READY) return <Entries />;

	const isWaitingForUrl =
		!videoId && player && status === YouTubePlayerStatus.LOADED;

	return isWaitingForUrl ? (
		<UrlForm player={player} />
	) : (
		<Center h="100%">
			<Loading message="Loading YouTube Player" />
		</Center>
	);
};

const UrlForm = ({ player }: { player: YouTubePlayer }) => {
	const urlRef = useRef("");
	const scheme = useComputedColorScheme();
	const theme = useMantineTheme();
	const [error, setError] = useState(false);

	const handleLoad = () => {
		const videoId = extractVideoIdFromUrl(urlRef.current);
		if (!videoId) setError(true);
		else player.setVideoId(videoId);
	};

	const isDark = scheme === "dark";
	const logoDark = theme.colors.grape[5];
	const logoLight = theme.colors.violet[9];

	return (
		<Container mt="2rem" size="md">
			<Stack align="center">
				<Text>Please enter/paste in a YouTube video URL</Text>
				<TextInputWithState
					w="100%"
					initValue=""
					error={error && "Not a valid YouTube video URL"}
					onChange={(s) => {
						setError(false);
						urlRef.current = s;
					}}
				/>
				<Button
					variant="filled"
					size="sm"
					color={isDark ? logoDark : logoLight}
					onClick={handleLoad}
				>
					Load
				</Button>
			</Stack>
		</Container>
	);
};
