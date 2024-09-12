import { Center, Text, Title, Stack } from "@mantine/core";

import classes from "./Landing.module.css";

export default () => {
	return (
		<Center className={classes.center}>
			<Stack className={classes.stack}>
				<Title>Welcome to the Choreo App!</Title>
				<Text>
					Choreo is an app that helps you compose choreography to music.
				</Text>
				<Text>
					The app can use audio from Youtube or your Spotify premium account to
					set up a web player that allows you to annotate time points in a track
					while it's playing. You can use these annotations to navigate around
					the song easily. The app allows you to save these annotations to CSV
					files for later.
				</Text>
			</Stack>
		</Center>
	);
};
