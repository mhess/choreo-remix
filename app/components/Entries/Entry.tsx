import { useAtom } from "jotai";
import {
	Button,
	CloseButton,
	Group,
	Modal,
	Stack,
	Text,
	Tooltip,
} from "@mantine/core";
import { IconArrowMoveDown } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";

import { displayMs } from "~/lib/utils";
import { useEstablishedPlayer } from "~/lib/atoms";
import { entryAtomsAtom, type AtomicEntry } from "~/lib/entries";

import TextInputWithAtom from "~/components/TextInputWithAtom";

import classes from "./Entry.module.css";

export default ({ entry }: { entry: AtomicEntry }) => {
	const player = useEstablishedPlayer();
	const [opened, { open: openFillModal, close: closeFillModal }] =
		useDisclosure();

	const [{ removeAtom }] = useAtom(entryAtomsAtom);
	const [, removeEntry] = useAtom(removeAtom);

	const { timeMs, countAtom, noteAtom, isCurrentAtom, countFillAtom } = entry;
	const [canFill, fillRest] = useAtom(countFillAtom);
	const [isCurrent] = useAtom(isCurrentAtom);

	const displayTime = displayMs(timeMs);

	const handleClickFillRest = () => {
		fillRest();
		closeFillModal();
	};

	return (
		<Group
			role="row"
			className={`${classes.entry}${isCurrent ? ` ${classes.highlight}` : ""}`}
		>
			<Modal
				aria-label="Fill in the rest?"
				opened={opened}
				onClose={closeFillModal}
				withCloseButton={false}
				padding="lg"
			>
				<Stack>
					<Text>
						Do you want to use the count of this entry and the previous entry to
						fill in the rest?
					</Text>
					<Group justify="right" gap="xs">
						{/* TODO: Maybe use app purple color? */}
						<Button size="sm" variant="filled" onClick={handleClickFillRest}>
							Yes
						</Button>
						<Button size="sm" variant="outline" onClick={closeFillModal}>
							No
						</Button>
					</Group>
				</Stack>
			</Modal>
			<TextInputWithAtom
				aria-label="count"
				leftSection={
					canFill ? (
						<Tooltip
							openDelay={750}
							w={211}
							label="Use the timing of this and the previous entry to fill in counts for the remaining entries"
							multiline
						>
							<IconArrowMoveDown
								className={classes.fillBtn}
								viewBox="2 4 20 16"
								role="button"
								onClick={openFillModal}
							/>
						</Tooltip>
					) : undefined
				}
				leftSectionWidth="22"
				classNames={{ input: classes.countInput }}
				min={0}
				type="number"
				atom={countAtom as Parameters<typeof TextInputWithAtom>[0]["atom"]}
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
				atom={noteAtom as Parameters<typeof TextInputWithAtom>[0]["atom"]}
			/>
			<CloseButton
				aria-label="Delete Entry"
				onClick={() => removeEntry(timeMs)}
			/>
		</Group>
	);
};
