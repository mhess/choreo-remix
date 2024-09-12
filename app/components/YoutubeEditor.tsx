import { useRef, useState } from "react";
import {
	Button,
	Center,
	Flex,
	Stack,
	Text,
	TextInput,
	useComputedColorScheme,
	useMantineTheme,
} from "@mantine/core";

import {
	extractVideoIdFromUrl,
	useYouTubePlayer,
	YouTubePlayerStatus,
} from "~/lib/youtube";

import Loading from "./Loading";
import Entries from "./Entries";

import classes from "./YouTubeEditor.module.css";

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
	const [url, setUrl] = useState("");
	const scheme = useComputedColorScheme();
	const theme = useMantineTheme();
	const [error, setError] = useState(false);

	const handleLoad = () => {
		const videoId = extractVideoIdFromUrl(url);
		if (!videoId) setError(true);
		else setVideoId(videoId);
	};

	const isDark = scheme === "dark";
	const logoDark = theme.colors.grape[5];
	const logoLight = theme.colors.violet[9];

	return (
		<Flex className={classes.flex}>
			<Stack className={classes.stack}>
				<Text>Please enter or paste in a YouTube video URL</Text>
				<TextInput
					w="100%"
					value={url}
					error={error && "Not a valid YouTube video URL"}
					onChange={(e) => {
						setError(false);
						setUrl(e.target.value);
					}}
				/>
				<Button
					disabled={!url.length}
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
