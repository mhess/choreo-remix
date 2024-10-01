import { useEffect, useState } from "react";
import { Container, Stack, Text, Box } from "@mantine/core";
import { IconCornerLeftUp, IconPlaylistAdd } from "@tabler/icons-react";

import { useMobileBreakpoint } from "~/lib/utils";

import classes from "./Help.module.css";

const desktoControlsHelp = (
	<>
		From left to right, the control bar below has the <b>current track time</b>,{" "}
		<b>playback buttons</b>, and the <b>Add Entry</b> button.
	</>
);

const mobileControlsHelp = (
	<>
		From left-to-right and top-to-bottom, the control bar below has the{" "}
		<b>current track time</b>, <b>Add Entry</b>, and <b>playback</b> buttons.
	</>
);

export default function Help({
	scrollerRef,
	containerRef,
}: { scrollerRef: ElementRef; containerRef: ElementRef }) {
	const isMobile = useMobileBreakpoint();
	const [entryHeight, setEntryHeight] = useState(0);

	useEffect(() => {
		const $scroller = scrollerRef.current;
		const { lastChild } = containerRef.current;
		$scroller.scrollTo(0, lastChild.offsetTop);
		setEntryHeight(lastChild?.clientHeight || 0);
	}, []);

	return (
		<Stack className={classes.help} h={`calc(100% - ${entryHeight}px)`}>
			<Container size="sm" className={classes.helpSection}>
				<Text>
					<IconCornerLeftUp width="1.25rem" /> The row above is an <b>entry</b>,
					which has a <b>count</b>, <b>timestamp</b>, and <b>note</b>.
				</Text>
				<dl className={classes.definitions}>
					<Box>
						<dt>Entry</dt>
						<dd>
							An annotation assigned to specific time point in the playing
							track.
						</dd>
					</Box>
					<Box>
						<dt>Count</dt>
						<dd>
							The number of user-specified measures/meters that have ellapsed at
							the timestamp for the entry. If you fill in the count values for
							the last two entries, all subsequently added entries will have
							their count values automatically generated based on the durations
							of the previous counts.
						</dd>
					</Box>
					<Box>
						<dt>Timestamp</dt>
						<dd>
							The time which the entry is annotating. Clicking on an entry's
							timestamp will seek to that point in the track.
						</dd>
					</Box>
					<Box>
						<dt>Note</dt>
						<dd>
							Whatever text you want to annotate that timestamp in a tack. For
							example, a dance pattern that should occur at that time.
						</dd>
					</Box>
				</dl>
			</Container>
			<Container size="sm" className={classes.helpSection}>
				<Box>
					<Text mb="xs">
						{isMobile ? mobileControlsHelp : desktoControlsHelp}
					</Text>
					<Text>
						The <b>Add Entry</b>{" "}
						<IconPlaylistAdd
							width="1.25rem"
							style={{ verticalAlign: "middle" }}
						/>{" "}
						button will add an entry at the current track time—even while the
						track is playing.
					</Text>
				</Box>
			</Container>
		</Stack>
	);
}
