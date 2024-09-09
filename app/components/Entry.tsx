import { useContext } from "react";
import { CloseButton, Group, TextInput, Text } from "@mantine/core";

import { useEntry, EntriesContext } from "~/lib/entries";
import { usePlayer } from "~/lib/spotify/player";
import { displayMs } from "~/lib/utils";
import classes from "./Entry.module.css";

export default ({ index }: { index: number }) => {
	const { removeEntry } = useContext(EntriesContext);
	const entry = useEntry(index);
	const player = usePlayer();
	const { count, setCount, timeMs, note, setNote, isHighlighted } = entry;

	const handleCountChange = (event: React.ChangeEvent<HTMLInputElement>) =>
		setCount(Number(event.target.value));

	const handleNoteChange = (event: React.ChangeEvent<HTMLInputElement>) =>
		setNote(event.target.value);

	return (
		<Group
			className={`${classes.entry}${isHighlighted ? ` ${classes.highlight}` : ""}`}
		>
			<TextInput
				classNames={{ input: classes.countInput }}
				value={Number(count).toString()}
				min={0}
				type="number"
				onChange={handleCountChange}
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
