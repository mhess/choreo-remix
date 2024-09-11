import { useEffect } from "react";
import type { MutableRefObject } from "react";
import { Box, Group, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { EntriesContext, useEntries } from "~/lib/entries";

import Help from "./Help";
import Controls from "./Controls";
import Entry from "./Entry";

import classes from "./Entries.module.css";
import { useEstablishedPlayer } from "~/lib/atoms";

export default () => {
	const player = useEstablishedPlayer();
	const entriesContextValue = useEntries(player);
	const { scrollerRef, containerRef, entries } = entriesContextValue;
	const [isHelpOpen, { toggle }] = useDisclosure(false);

	useEffect(
		() => () => {
			player.pause();
		},
		[player],
	);

	return (
		<EntriesContext.Provider value={entriesContextValue}>
			{isHelpOpen && <EntryHeader />}
			<Box
				className={classes.entries}
				pb={isHelpOpen ? 0 : "2rem"}
				ref={scrollerRef as MutableRefObject<HTMLDivElement>}
			>
				{!isHelpOpen && <EntryHeader />}
				<Box ref={containerRef as MutableRefObject<HTMLDivElement>}>
					{entries.map(({ timeMs }, index) => (
						<Entry key={timeMs} index={index} />
					))}
				</Box>
				{isHelpOpen && (
					<Help scrollerRef={scrollerRef} containerRef={containerRef} />
				)}
			</Box>
			<Controls help={{ isShowing: isHelpOpen, toggle }} />
		</EntriesContext.Provider>
	);
};

const EntryHeader = () => (
	<Group className={classes.entryHeader}>
		<Text className={classes.count}>count</Text>
		<Text className={classes.timestamp}>timestamp</Text>
		<Text pl="sm">note</Text>
	</Group>
);
