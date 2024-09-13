import type { ChangeEvent } from "react";
import { Center } from "@mantine/core";

import { FilePlayerStatus, useAudioFilePlayer } from "~/lib/audioFile";

import Entries from "./Entries";
import CenteredLoading from "./CenteredLoading";

export default () => {
	const { status, setFile, audioElRef } = useAudioFilePlayer();

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target?.files?.[0];
		if (file) setFile(file);
	};

	switch (status) {
		case FilePlayerStatus.READY:
			return <Entries />;
		case FilePlayerStatus.LOADING:
			return <CenteredLoading message="Waiting for data" />;
		case FilePlayerStatus.NO_FILE:
			return (
				<Center>
					<input type="file" onChange={handleFileChange} />
				</Center>
			);
	}
};
