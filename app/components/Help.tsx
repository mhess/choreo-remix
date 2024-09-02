import { Container, Stack, Text, Box } from "@mantine/core";
import { useEffect, useState } from "react";

import classes from "./Help.module.css";
import Icon from "./Icon";

export default ({
	scrollerRef,
	containerRef,
}: { scrollerRef: ElementRef; containerRef: ElementRef }) => {
	useEffect(() => {
		const $scroller = scrollerRef.current;
		$scroller.scrollTo(0, containerRef.current.lastChild.offsetTop);
	}, []);

	return (
		<Stack className={classes.help}>
			<Container size="sm" className={classes.helpSection}>
				<Text>
					<Icon name="reply" className={classes.pointUp} /> The row above is an{" "}
					<b>entry</b>, which has a <b>count</b>, <b>timestamp</b>, and{" "}
					<b>note</b>. Each of these terms is defined below.
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
							the last two entries, all subsequently added entries will havet
							their count values automatically generated based on the durations
							of the previous counts.
						</dd>
					</Box>
					<Box>
						<dt>Timestamp</dt>
						<dd>
							The time which the entry is annotating. Clicking on an entries
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
				<Icon name="reply" className={classes.pointDown} />
				<Box>
					<Text>
						From left to right, the control bar below has the{" "}
						<b>current track time</b>, <b>playback buttons</b>, and the{" "}
						<b>Add Entry</b> button.
					</Text>
					<Text>
						The <b>Add Entry</b>{" "}
						<Icon
							name="playlist_add"
							style={{ fontSize: "1.25rem", verticalAlign: "middle" }}
						/>{" "}
						button will add an entry at the current track time—even while the
						track is playing.
					</Text>
				</Box>
			</Container>
		</Stack>
	);
};
