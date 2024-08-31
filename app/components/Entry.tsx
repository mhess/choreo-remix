import { useContext } from "react";
import {
	CloseButton,
	Group,
	TextInput,
	Text,
	useMantineTheme,
} from "@mantine/core";

import { useEntry, EntriesContext } from "../lib/entries";
import { usePlayer } from "../lib/spotify";
import { displayMs } from "../lib/utils";
import classes from "./Entry.module.css";

export default ({ index }: { index: number }) => {
	const theme = useMantineTheme();
	const { removeEntry } = useContext(EntriesContext);
	const entry = useEntry(index);
	const player = usePlayer();
	const { meter, timeMs, note, isHighlighted } = entry;

	const handleMeterChange = (event: React.ChangeEvent<HTMLInputElement>) =>
		entry.setMeter(Number(event.target.value));

	const handleNoteChange = (event: React.ChangeEvent<HTMLInputElement>) =>
		entry.setNote(event.target.value);

	return (
		<Group
			className={classes.entry}
			bg={isHighlighted ? theme.colors.orange[4] : ""}
		>
			<TextInput
				classNames={{ input: classes.meterInput }}
				value={Number(meter).toString()}
				min={0}
				type="number"
				onChange={handleMeterChange}
			/>
			<Text
				className={classes.timestamp}
				span
				onClick={() => player.seekTo(timeMs)}
			>
				{displayMs(timeMs)}
			</Text>
			<TextInput
				flex={1}
				mr="0.5rem"
				value={note}
				onChange={handleNoteChange}
			/>
			<CloseButton onClick={() => removeEntry(index)} />
		</Group>
	);
};
