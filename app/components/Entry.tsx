import { CloseButton, Group, TextInput, Text } from "@mantine/core";

import { useEntry } from "~/lib/entries";
import { usePlayer } from "~/lib/spotify/player";
import { displayMs } from "~/lib/utils";

import classes from "./Entry.module.css";

export default ({ index }: { index: number }) => {
	const player = usePlayer();
	const { count, setCount, timeMs, note, setNote, isHighlighted, remove } =
		useEntry(index);

	const handleCountChange = (event: React.ChangeEvent<HTMLInputElement>) =>
		setCount(Number(event.target.value));

	const handleNoteChange = (event: React.ChangeEvent<HTMLInputElement>) =>
		setNote(event.target.value);

	const displayTime = displayMs(timeMs);

	return (
		<Group
			role="row"
			className={`${classes.entry}${isHighlighted ? ` ${classes.highlight}` : ""}`}
		>
			<TextInput
				aria-label="count"
				classNames={{ input: classes.countInput }}
				value={Number(count).toString()}
				min={0}
				type="number"
				onChange={handleCountChange}
			/>
			<Text
				role="button"
				aria-label={`Seek to ${displayTime}`}
				span
				className={classes.timestamp}
				onClick={() => player.seekTo(timeMs)}
			>
				{displayTime}
			</Text>
			<TextInput
				aria-label="note"
				flex={1}
				mr="0.5rem"
				value={note}
				onChange={handleNoteChange}
			/>
			<CloseButton aria-label="Delete Entry" onClick={() => remove(index)} />
		</Group>
	);
};
