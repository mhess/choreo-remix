import { useState, useEffect, useContext } from "react";
import type { HTMLProps, LegacyRef } from "react";
import {
	useSpotifyPlayer,
	PlayerContext,
	usePlayer,
	PlayerStatus,
} from "../lib/spotify";
import type {
	WrappedPlayer,
	PlayerStateCallback,
	SpotifyAuthToken,
} from "../lib/spotify";
import { EntriesContext, useEntries, useEntry } from "../lib/entries";
import { Link } from "@remix-run/react";

export default ({ token }: { token: SpotifyAuthToken }) => {
	const { player, status } = useSpotifyPlayer(token);

	return status === PlayerStatus.READY ? (
		<Editor player={player as WrappedPlayer} />
	) : (
		<StatusMessage status={status} />
	);
};

const TryAgain = ({ message }: { message: string }) => (
	<p>
		{message} Would you like to try to <Link to="auth/login">log in</Link>{" "}
		again?
	</p>
);

const messageByStatus: Record<PlayerStatus, React.ReactNode> = {
	[PlayerStatus.READY]: "shouldn't happen!",
	[PlayerStatus.LOADING]: "Connecting to Spotify",

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

const StatusMessage = ({ status }: { status: PlayerStatus }) => {
	return <div className="status-message">{messageByStatus[status]}</div>;
};

const Editor = ({ player }: { player: WrappedPlayer }) => {
	const entries = useEntries(player);

	return (
		<PlayerContext.Provider value={player}>
			<EntriesContext.Provider value={entries}>
				<div className="editor">
					<TopBar />
					<div
						className="entries"
						ref={entries.scrollerRef as LegacyRef<HTMLDivElement>}
					>
						{entries.entries.map((entry, index) => (
							<Entry key={entry.entry.timeMs} index={index} />
						))}
					</div>
					<Controls />
				</div>
			</EntriesContext.Provider>
		</PlayerContext.Provider>
	);
};

const TopBar = () => {
	const player = usePlayer();
	const {
		entries,
		loadFromCSV,
		saveToCSV,
		clear: clearEntries,
	} = useContext(EntriesContext);
	const [track, setTrack] = useState<Spotify.Track>();

	useEffect(() => {
		const cb: PlayerStateCallback = ({ track_window }) =>
			setTrack(track_window.current_track);
		player.addOnStateChange(cb);
		return () => player.removeOnStateChange(cb);
	}, []);

	let info: React.ReactNode;
	if (track) {
		const artists = track.artists.map(({ name }) => name).join(", ");
		info = (
			<>
				<span className="artist">{artists}</span>
				{": "}
				<span className="track">{track.name}</span>
			</>
		);
	}

	const handleSaveCSV = () => {
		if (!track) return;
		const formattedTrackName = track.name
			.toLocaleLowerCase()
			.replaceAll(" ", "_");
		saveToCSV(formattedTrackName);
	};

	const handleLoadCSV = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
		const file = target?.files?.[0];
		if (!file) return alert("No file was selected :(");
		if (file.type !== "text/csv") alert(`File must be of type "text/csv"`);
		loadFromCSV(file);
	};

	return (
		<div className="top-bar">
			<span className="track-info">{info}</span>
			<span className="actions">
				{track && <button onClick={handleSaveCSV}>Save as CSV</button>}
				<label htmlFor="csv-upload" className="load-button">
					Load from CSV
					<input id="csv-upload" type="file" onChange={handleLoadCSV} />
				</label>
				{!!entries.length && <button onClick={clearEntries}>Clear</button>}
				<button onClick={() => player.authToken.reset()}>Log Out</button>
			</span>
		</div>
	);
};

const Controls = () => {
	const { addEntry } = useContext(EntriesContext);
	const player = usePlayer();
	const [paused, setPaused] = useState(false);

	useEffect(() => {
		const cb: PlayerStateCallback = ({ paused }) => setPaused(paused);
		player.addOnStateChange(cb);
		return () => player.removeOnStateChange(cb);
	}, []);

	const handleSeekDir = (ms: number) => async () => {
		const state = await player.getCurrentState();
		if (!state) return;
		player.seekTo(ms + state.position);
	};

	const handleAddEntry = async () => {
		const state = await player.getCurrentState();
		if (!state) return;
		addEntry(state.position);
	};

	return (
		<div className="controls">
			<TrackTime />
			<button className="playback-button" onClick={handleSeekDir(-5000)}>
				<Icon name="fast_rewind" /> 5
			</button>
			<button className="playback-button" onClick={() => player.togglePlay()}>
				{paused ? <Icon name="play_arrow" /> : <Icon name="pause" />}
			</button>
			<button className="playback-button" onClick={handleSeekDir(5000)}>
				5 <Icon name="fast_forward" />
			</button>
			<button className="playback-button add-entry" onClick={handleAddEntry}>
				<Icon
					style={{ position: "relative", top: "1px" }}
					name="playlist_add"
				/>
			</button>
		</div>
	);
};

const Icon = ({
	name,
	...props
}: { name: string } & HTMLProps<HTMLSpanElement>) => (
	<span className="material-symbols-outlined" {...props}>
		{name}
	</span>
);

const TrackTime = () => {
	const [timeMs, setTimeMs] = useState(0);
	const player = usePlayer();

	useEffect(() => {
		const cb: PlayerStateCallback = ({ position }) => setTimeMs(position);
		player.addOnTick(cb);
		return () => player.removeOnTick(cb);
	}, []);

	return <span className="time-display">{displayMs(timeMs)}</span>;
};

const Entry = ({ index }: { index: number }) => {
	const { removeEntry } = useContext(EntriesContext);
	const entry = useEntry(index);
	const player = usePlayer();
	const { meter, timeMs, note, isHighlighted } = entry;

	const handleMeterChange = (event: React.ChangeEvent<HTMLInputElement>) =>
		entry.setMeter(Number(event.target.value));

	const handleNoteChange = (event: React.ChangeEvent<HTMLInputElement>) =>
		entry.setNote(event.target.value);

	return (
		<div
			className="entry"
			style={{ backgroundColor: isHighlighted ? "#ffc05f" : "" }}
		>
			<input
				className="meter"
				value={Number(meter).toString()}
				min={0}
				type="number"
				onChange={handleMeterChange}
			/>
			<span className="timestamp" onClick={() => player.seekTo(timeMs)}>
				{displayMs(timeMs)}
			</span>
			<input className="note" value={note} onChange={handleNoteChange} />
			<button onClick={() => removeEntry(index)}>
				<Icon name="delete" />
			</button>
		</div>
	);
};

const displayMs = (totalMs: number) => {
	const ms = (totalMs % 1000).toString().slice(0, 2).padStart(2, "0");
	const totalSeconds = Math.floor(totalMs / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = (totalSeconds % 60).toString().padStart(2, "0");

	return `${minutes}:${seconds}.${ms}`;
};
