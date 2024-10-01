import { useEffect, useRef } from "react";
import { useAtom } from "jotai";
import { Box, Group, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { useEstablishedPlayer } from "~/lib/atoms";
import { setOnIndexChangeAtom, useInitializedEntries } from "~/lib/entries";

import Help from "./Help";
import Controls from "./Controls";
import Entry from "./Entry";

import classes from "./Entries.module.css";

export default function Entries() {
	const player = useEstablishedPlayer();

	const scrollerRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const { entriesAtom, currentIndexAtom } = useInitializedEntries();
	const [, setCallback] = useAtom(setOnIndexChangeAtom);
	const [, setCurrentIndexForTime] = useAtom(currentIndexAtom);
	const [entries] = useAtom(entriesAtom);

	const [isHelpOpen, { toggle }] = useDisclosure(false);

	useEffect(() => {
		setCallback((index) =>
			setEntriesScrollPosition(scrollerRef, containerRef, index),
		);

		player.addOnTick(setCurrentIndexForTime);

		return () => {
			player.removeOnTick(setCurrentIndexForTime);
			player.pause();
		};
	}, [player]);

	return (
		<>
			{isHelpOpen && <EntryHeader />}
			<Box
				role="region"
				aria-label="Entries"
				className={classes.entries}
				pb={isHelpOpen ? 0 : "2rem"}
				ref={scrollerRef}
			>
				{!isHelpOpen && <EntryHeader />}
				<Box ref={containerRef}>
					{entries.map((entry) => (
						<Entry key={entry.timeMs} entry={entry} />
					))}
				</Box>
				{isHelpOpen && (
					<Help scrollerRef={scrollerRef} containerRef={containerRef} />
				)}
			</Box>
			<Controls help={{ isShowing: isHelpOpen, toggle }} />
		</>
	);
}

const EntryHeader = () => (
	<Group className={classes.entryHeader} role="row">
		<Text className={classes.count} role="columnheader">
			count
		</Text>
		<Text className={classes.timestamp} role="columnheader">
			timestamp
		</Text>
		<Text pl="sm" role="columnheader">
			note
		</Text>
	</Group>
);

const setEntriesScrollPosition = (
	scrollRef: ElementRef,
	containerRef: ElementRef,
	newIndex: number,
) => {
	const $scroller = scrollRef.current;
	if ($scroller) {
		const $child = containerRef.current?.childNodes[newIndex] as HTMLElement;
		if (!$child) return;

		const oldTop = $scroller.scrollTop;
		const childBottom = $child.offsetTop + $child.clientHeight;
		if (childBottom > oldTop + $scroller.clientHeight) {
			const halfClient = $scroller.clientHeight >> 1;
			const newTop = $child.offsetTop - halfClient;
			$scroller.scrollTo(0, newTop);
		}
	}
};
