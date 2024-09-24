import { useState } from "react";
import {
	Box,
	Button,
	Center,
	Flex,
	Group,
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

import Entries from "./Entries";

import classes from "./YouTubeEditor.module.css";
import CenteredLoading from "./CenteredLoading";

export default () => {
	const { status, setStatus, setVideoId } = useYouTubePlayer();

	const handleRetry = () => {
		setVideoId(null);
		setStatus(YouTubePlayerStatus.LOADED);
	};

	switch (status) {
		case YouTubePlayerStatus.LOADING:
			return <CenteredLoading message="Loading YouTube player" />;
		case YouTubePlayerStatus.BAD_ID:
			return (
				<Box ta="center" mt="2rem">
					<Text>Cannot use that video ID.</Text>
					<Text className={classes.different} onClick={handleRetry}>
						Try a different one?
					</Text>
				</Box>
			);
		case YouTubePlayerStatus.LOADED:
			return <UrlForm setVideoId={setVideoId} />;
		case YouTubePlayerStatus.BUFFERING:
			return <CenteredLoading message="Waiting for video to load" />;
		case YouTubePlayerStatus.READY:
			return <Entries />;
		default:
			return <Center mt="2rem">Oops! Something went wrong!</Center>;
	}
};

const UrlForm = ({ setVideoId }: { setVideoId: (id: string) => void }) => {
	const [input, setInput] = useState("");
	const scheme = useComputedColorScheme();
	const theme = useMantineTheme();
	const [error, setError] = useState(false);

	const handleLoadUrl = () => {
		const videoId = extractVideoIdFromUrl(input);
		if (!videoId) setError(true);
		else setVideoId(videoId);
	};

	const handleLoadId = () => {
		setVideoId(input);
	};

	const isDark = scheme === "dark";
	const logoDark = theme.colors.grape[5];
	const logoLight = theme.colors.violet[9];

	return (
		<Flex className={classes.flex}>
			<Stack className={classes.stack}>
				<Text>Please enter or paste in a YouTube video URL or ID</Text>
				<TextInput
					value={input}
					styles={{ root: { width: "100%" }, input: { textAlign: "center" } }}
					error={error && "Not a valid YouTube URL"}
					onChange={(e) => {
						setError(false);
						setInput(e.target.value);
					}}
				/>
				<Group>
					<Button
						disabled={!input.length}
						variant="filled"
						size="sm"
						color={isDark ? logoDark : logoLight}
						onClick={handleLoadUrl}
					>
						Load Url
					</Button>
					<Button
						disabled={!input.length}
						variant="filled"
						size="sm"
						color={isDark ? logoDark : logoLight}
						onClick={handleLoadId}
					>
						Load video ID
					</Button>
				</Group>
			</Stack>
		</Flex>
	);
};
