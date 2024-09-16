import { useAtom } from "jotai";
import { CloseButton, Group, Text } from "@mantine/core";

import { displayMs } from "~/lib/utils";
import { useEstablishedPlayer } from "~/lib/atoms";
import { entryAtomsForPlatform, type AtomicEntry } from "~/lib/entries";

import TextInputWithAtom from "~/components/TextInputWithAtom";

import classes from "./Entry.module.css";

export default ({ entry, index }: { entry: AtomicEntry; index: number }) => {
	const player = useEstablishedPlayer();

	const [{ removeAtom }] = useAtom(entryAtomsForPlatform);
	const [, removeEntry] = useAtom(removeAtom);

	const { timeMs, countAtom, noteAtom, isCurrentAtom } = entry;
	const [isCurrent] = useAtom(isCurrentAtom);

	const displayTime = displayMs(timeMs);

	return (
		<Group
			role="row"
			className={`${classes.entry}${isCurrent ? ` ${classes.highlight}` : ""}`}
		>
			<TextInputWithAtom
				aria-label="count"
				classNames={{ input: classes.countInput }}
				min={0}
				type="number"
				atom={countAtom}
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
			<TextInputWithAtom
				aria-label="note"
				flex={1}
				mr="0.5rem"
				atom={noteAtom}
			/>
			<CloseButton
				aria-label="Delete Entry"
				onClick={() => removeEntry(index)}
			/>
		</Group>
	);
};
