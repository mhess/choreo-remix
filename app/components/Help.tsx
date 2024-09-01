import { Container, Stack, Text, Box } from "@mantine/core";
import { useEffect, useState } from "react";

import classes from "./Help.module.css";
import Icon from "./Icon";

export default ({
	scrollerRef,
	containerRef,
}: { scrollerRef: ElementRef; containerRef: ElementRef }) => {
	const [height, setHeight] = useState(0);

	useEffect(() => {
		const $scroller = scrollerRef.current;
		const scrollerHeight = $scroller?.clientHeight | 0;
		const lastChildHeight = containerRef.current?.lastChild.clientHeight | 0;
		setHeight(scrollerHeight - lastChildHeight);
	}, []);

	useEffect(() => {
		if (!height) return;
		const $scroller = scrollerRef.current;
		$scroller?.scrollTo(0, $scroller.scrollHeight - height);
	}, [height]);

	return (
		<Stack h={height} className={classes.help}>
			<Container size="sm" className={classes.helpSection}>
				<Text>
					<Icon name="reply" className={classes.pointUp} /> The row above is an{" "}
					<b>entry</b>, which has a <b>count</b>, <b>timestamp</b>, and{" "}
					<b>note</b>. Each of these terms is defined below. If you fill in
					non-zero <b>count</b> values, then subsequently added entries will
					automatically have their <b>count</b> valued filled in based on the
					durations of the existing counts.
				</Text>
				<dl>
					<dt>count</dt>
					<dd>
						The number of user-specified measures/meters that have ellapsed at
						the timestamp for the entry.
					</dd>
					<dt>timestamp</dt>
					<dd>The time which the entry is annotating.</dd>
					<dt>note</dt>
					<dd>
						Whatever text you want to annotate that timestamp in a tack. For
						example, a dance pattern that should occur at that time.
					</dd>
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
						button will add an entry at the current track time. Even while the
						track is playing.
					</Text>
				</Box>
			</Container>
		</Stack>
	);
};
