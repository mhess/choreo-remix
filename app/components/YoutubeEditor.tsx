import { useRef, useState } from "react";
import {
	Button,
	Center,
	Flex,
	Stack,
	Text,
	useComputedColorScheme,
	useMantineTheme,
} from "@mantine/core";

import {
	extractVideoIdFromUrl,
	useYouTubePlayer,
	YouTubePlayerStatus,
} from "~/lib/youtube";

import TextInputWithState from "./TextInputWithState";
import Loading from "./Loading";
import Entries from "./Entries";

export default () => {
	const { status, setVideoId } = useYouTubePlayer();

	switch (status) {
		case YouTubePlayerStatus.LOADING:
			return <CenteredLoading message="Loading YouTube player" />;
		case YouTubePlayerStatus.LOADED:
			return <UrlForm setVideoId={setVideoId} />;
		case YouTubePlayerStatus.BUFFERING:
			return <CenteredLoading message="Waiting for video to load" />;
		case YouTubePlayerStatus.READY:
			return <Entries />;
		default:
			return <Center>Oops! Something went wrong!</Center>;
	}
};

const UrlForm = ({ setVideoId }: { setVideoId: (id: string) => void }) => {
	const urlRef = useRef("");
	const scheme = useComputedColorScheme();
	const theme = useMantineTheme();
	const [error, setError] = useState(false);

	const handleLoad = () => {
		const videoId = extractVideoIdFromUrl(urlRef.current);
		if (!videoId) setError(true);
		else setVideoId(videoId);
	};

	const isDark = scheme === "dark";
	const logoDark = theme.colors.grape[5];
	const logoLight = theme.colors.violet[9];

	return (
		<Flex justify="center" mt="2rem" w="100%">
			<Stack align="center" maw="50rem" flex={1}>
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
		</Flex>
	);
};

const CenteredLoading = ({ message }: { message: string }) => (
	<Center h="100%">
		<Loading message={message} />
	</Center>
);
