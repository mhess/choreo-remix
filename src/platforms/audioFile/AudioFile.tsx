import {
	useRef,
	type MutableRefObject,
	type ChangeEvent,
	type PropsWithChildren,
} from "react";
import {
	Button,
	Flex,
	Stack,
	useComputedColorScheme,
	useMantineTheme,
} from "@mantine/core";

import { FilePlayerStatus, useAudioFilePlayer } from "./internals";

import CenteredLoading from "~/components/CenteredLoading";

export default function AudioFileEditor({ children }: PropsWithChildren) {
	const { status, setFile } = useAudioFilePlayer();
	const scheme = useComputedColorScheme();
	const theme = useMantineTheme();
	const fileInputRef = useRef<HTMLInputElement>();

	const isDark = scheme === "dark";
	const logoDark = theme.colors.grape[5];
	const logoLight = theme.colors.violet[9];

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target?.files?.[0];
		if (file) setFile(file);
	};

	switch (status) {
		case FilePlayerStatus.READY:
			return children;
		case FilePlayerStatus.LOADING:
			return <CenteredLoading message="Waiting for data" />;
		case FilePlayerStatus.NO_FILE:
			return (
				<Flex justify="center" mt="2rem">
					<Stack>
						<Button
							color={isDark ? logoDark : logoLight}
							size="md"
							variant="filled"
							onClick={() => fileInputRef.current?.click()}
						>
							Select an audio file
						</Button>
						<input
							style={{ visibility: "hidden" }}
							ref={fileInputRef as MutableRefObject<HTMLInputElement>}
							type="file"
							onChange={handleFileChange}
						/>
					</Stack>
				</Flex>
			);
	}
}
