import { useContext } from "react";

import { useEntry, EntriesContext } from "../lib/entries";
import { usePlayer } from "../lib/spotify";
import { displayMs } from "../lib/utils";
import Icon from "./Icon";

export default ({ index }: { index: number }) => {
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
