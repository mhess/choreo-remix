import { Container, Text, Title, Stack } from "@mantine/core";
import { Link } from "@remix-run/react";

export default () => {
	return (
		<Container size="sm">
			<Stack gap="md">
				<Title>Welcome to the Choreo App!</Title>
				<Text>
					Choreo is an app that helps you compose choreography to music.
				</Text>
				<Text>
					The app uses your Spotify premium account to set up a web player that
					allows you to annotate time points in a track while it's playing. You
					can use these annotations to navigate around the song easily. The app
					allows you to save these annotations to CSV files for later.
				</Text>
				<Text>
					<Link to="auth/login">Log&nbsp;in</Link> with your Spotify premium
					account to use the app.
				</Text>
			</Stack>
		</Container>
	);
};
