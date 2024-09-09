import { useContext, useEffect, useState } from "react";
import { CloseButton, Group, Text } from "@mantine/core";

import { EntriesContext } from "~/lib/entries";
import { usePlayer } from "~/lib/spotify/player";
import { displayMs } from "~/lib/utils";

import TextInputWithState from "./TextInputWithState";

import classes from "./Entry.module.css";

export default ({ index }: { index: number }) => {
	const { entries, setHighlighter, entryModified, removeEntry } =
		useContext(EntriesContext);
	const player = usePlayer();
	const [isHighlighted, setIsHighlighted] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: setHighlighter function always behaves the same
	useEffect(() => {
		setHighlighter(index, setIsHighlighted);
		return () => setHighlighter(index);
	}, [index]);

	const entry = entries[index];
	const { count, timeMs, note } = entry;

	const setCount = (count: string) => {
		entry.count = Number(count);
		entryModified();
	};

	const setNote = (note: string) => {
		entry.note = note;
		entryModified();
	};

	const displayTime = displayMs(timeMs);

	return (
		<Group
			role="row"
			className={`${classes.entry}${isHighlighted ? ` ${classes.highlight}` : ""}`}
		>
			<TextInputWithState
				aria-label="count"
				classNames={{ input: classes.countInput }}
				initValue={Number(count).toString()}
				min={0}
				type="number"
				onChange={setCount}
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
			<TextInputWithState
				aria-label="note"
				flex={1}
				mr="0.5rem"
				initValue={note}
				onChange={setNote}
			/>
			<CloseButton
				aria-label="Delete Entry"
				onClick={() => removeEntry(index)}
			/>
		</Group>
	);
};
