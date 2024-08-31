import { useEffect, useContext, useRef } from "react";
import type { MutableRefObject, RefObject } from "react";
import {
	Box,
	Button,
	Center,
	Group,
	Modal,
	Text,
	TextInput,
} from "@mantine/core";
import { Link } from "@remix-run/react";

import { useSpotifyPlayer, PlayerContext, PlayerStatus } from "../lib/spotify";
import type { SpotifyAuthToken } from "../lib/spotify";
import { EntriesContext, useEntries } from "../lib/entries";
import type { MeterDialogData } from "../lib/entries";
import { displayMs } from "../lib/utils";

import classes from "./Editor.module.css";
import Loading from "./Loading";
import Header from "./Header";
import Controls from "./Controls";
import Entry from "./Entry";

export default ({ token }: { token: SpotifyAuthToken }) => {
	const { player, status } = useSpotifyPlayer(token);
	const isPlayerReady = status === PlayerStatus.READY && !!player;
	const entries = useEntries(player);

	return (
		<EntriesContext.Provider value={entries}>
			<Header player={player} logout={token.reset} />
			{isPlayerReady ? (
				<PlayerContext.Provider value={player}>
					<Entries />
				</PlayerContext.Provider>
			) : (
				<Center h="100%">{messageByStatus[status]}</Center>
			)}
		</EntriesContext.Provider>
	);
};

const Entries = () => {
	const player = useContext(PlayerContext);
	const { entries, scrollerRef, meterDialog, closeMeterDialog } =
		useContext(EntriesContext);

	useEffect(
		() => () => {
			player.pause();
		},
		[],
	);

	return (
		<>
			<Box
				className={classes.entries}
				ref={scrollerRef as MutableRefObject<HTMLDivElement>}
			>
				{entries.map((entry, index) => (
					<Entry key={entry.timeMs} index={index} />
				))}
			</Box>
			<Controls />
			<MeterDialog data={meterDialog} close={closeMeterDialog} />
		</>
	);
};

const TryAgain = ({ message }: { message: string }) => (
	<Text>
		{message} Would you like to try to <Link to="auth/login">log in</Link>{" "}
		again?
	</Text>
);

const messageByStatus: Record<PlayerStatus, React.ReactNode> = {
	[PlayerStatus.READY]: "shouldn't happen!",
	[PlayerStatus.LOADING]: <Loading message="Connecting to Spotify" />,
	[PlayerStatus.NOT_CONNECTED]: `Please connect to the "Choreo" device on your Spotify player`,
	[PlayerStatus.PLAYBACK_ERROR]: (
		<TryAgain message="There was an error with playback." />
	),
	[PlayerStatus.INIT_ERROR]: <TryAgain message="Initialization Failed." />,
	[PlayerStatus.ACCT_ERROR]: (
		<TryAgain message="There was a problem with your account. Spotify requires a premium account for application access." />
	),
	[PlayerStatus.AUTH_ERROR]: <TryAgain message="Could not authorize access." />,
};

const MeterDialog = ({
	data,
	close,
}: {
	data?: MeterDialogData;
	close: ReturnType<typeof useEntries>["closeMeterDialog"];
}) => {
	const inputRef = useRef<HTMLInputElement>();
	const isOpen = !!data;

	const handleClose = (isClose: boolean) => () => {
		if (isClose) return close(null);
		close(Number(inputRef.current?.value));
	};

	return (
		<Modal
			opened={isOpen}
			onClose={handleClose(true)}
			title="Please set a meter for this next entry"
			classNames={{
				title: classes.meterDialogTitle,
				body: classes.meterDialogBody,
			}}
			transitionProps={{ onEntered: () => inputRef.current?.focus() }}
		>
			<TextInput
				classNames={{
					root: classes.meterDialogInputRoot,
					input: classes.meterDialogInputInput,
					label: classes.meterDialogInputLabel,
				}}
				label={`Meter at time ${displayMs(data?.timeMs || 12345)}`}
				ref={inputRef as MutableRefObject<HTMLInputElement>}
				placeholder={data?.defaultMeter.toString()}
				type="number"
				min="0"
			/>
			<Text size="sm">
				The meter for future entries will be generated automatically.
			</Text>
			<Group justify="right">
				<Button onClick={handleClose(false)} size="sm" variant="filled">
					Save
				</Button>
			</Group>
		</Modal>
	);
};
