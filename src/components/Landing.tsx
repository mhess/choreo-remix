import { Flex, Text, Title, Stack, Group, Button } from "@mantine/core";
import { useAtom } from "jotai";

import { platformAtom } from "~/lib/platformAtoms";
import appClasses from "~/App.module.css";

import { AudioFile, Spotify, YouTube } from "./Logos";

import classes from "./Landing.module.css";

const btnClasses = `${classes.btn} ${appClasses.outlineBtn}`;

export default function Landing() {
	const [, selectPlatform] = useAtom(platformAtom);
	return (
		<Flex className={classes.flex}>
			<Stack className={classes.stack}>
				<Title>Welcome to the Choreo App!</Title>
				<Text>
					Choreo is an app that helps you compose choreography to music.
				</Text>
				<Text>
					The app can use audio from{" "}
					<Text fw={700} span>
						Youtube,
					</Text>{" "}
					a{" "}
					<Text fw={700} span>
						Spotify
					</Text>{" "}
					premium account, or a{" "}
					<Text fw={700} span>
						local file
					</Text>{" "}
					to set up a web player that allows you to annotate time points in a
					track while it's playing. You can use these annotations to navigate
					around the song easily. The app allows you to save these annotations
					to CSV files for later.
				</Text>
				<Group justify="center" mt="1rem">
					<Button
						classNames={{ root: btnClasses }}
						variant="outline"
						size="sm"
						onClick={() => selectPlatform("youtube")}
					>
						<Group gap="xs">
							<span>Use YouTube</span>
							<YouTube />
						</Group>
					</Button>
					<Button
						classNames={{ root: btnClasses }}
						variant="outline"
						size="sm"
						onClick={() => selectPlatform("spotify")}
					>
						<Group gap="xs">
							<span>Use Spotify Premium</span>
							<Spotify height="20" />
						</Group>
					</Button>
					<Button
						classNames={{ root: btnClasses }}
						variant="outline"
						size="sm"
						onClick={() => selectPlatform("audioFile")}
					>
						<Group gap="xs">
							<span>Use a local audio file</span>
							<AudioFile />
						</Group>
					</Button>
				</Group>
			</Stack>
		</Flex>
	);
}
