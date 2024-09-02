import { useContext } from "react";
import {
	CloseButton,
	Group,
	TextInput,
	Text,
	useMantineTheme,
	useComputedColorScheme,
	darken,
} from "@mantine/core";

import { useEntry, EntriesContext } from "../lib/entries";
import { usePlayer } from "../lib/spotify";
import { displayMs } from "../lib/utils";
import classes from "./Entry.module.css";

export default ({ index }: { index: number }) => {
	const theme = useMantineTheme();
	const isDark = useComputedColorScheme() === "dark";
	const { removeEntry } = useContext(EntriesContext);
	const entry = useEntry(index);
	const player = usePlayer();
	const { count, timeMs, note, isHighlighted } = entry;

	let highlightColor = theme.colors.orange[4];
	if (isDark) highlightColor = darken(highlightColor, 0.5);

	const handleCountChange = (event: React.ChangeEvent<HTMLInputElement>) =>
		entry.setCount(Number(event.target.value));

	const handleNoteChange = (event: React.ChangeEvent<HTMLInputElement>) =>
		entry.setNote(event.target.value);

	return (
		<Group className={classes.entry} bg={isHighlighted ? highlightColor : ""}>
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
