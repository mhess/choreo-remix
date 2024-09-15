import { atom } from "jotai";
import type { Getter, PrimitiveAtom, Setter, WritableAtom } from "jotai";

import {
	platformAtom,
	playerPlatforms,
	type PlayerPlatform,
} from "~/lib/atoms";

export type Entry = {
	countAtom: PrimitiveAtom<number>;
	timeMs: number;
	noteAtom: PrimitiveAtom<string>;
	isCurrentAtom: PrimitiveAtom<boolean>;
};

type PlatformEntryAtoms = {
	entriesAtom: PrimitiveAtom<Entry[]>;
	addAtom: WritableAtom<null, [number], void>;
	removeAtom: WritableAtom<null, [number], void>;
	clearAtom: WritableAtom<null, [number], void>;
	currentIndexAtom: WritableAtom<null, [number], void>;
};

type ScrollCallback = (currentIndex: number) => void;

const INITIAL_ENTRY_COUNT = 0;
const INITIAL_ENTRY_TIME_MS = 0;
const INITIAL_ENTRY_NOTE = "Start";

// Function is wrapped in array here bc jotai doesn't support functions as values
const onIndexChangeAtom = atom<[ScrollCallback]>();
export const setOnIndexChangeAtom = atom(null, (_, set, cb: ScrollCallback) =>
	set(onIndexChangeAtom, [cb]),
);

export const entryAtomsForPlatform = atom(
	(get) => entryAtomsByPlatform[get(platformAtom) as PlayerPlatform],
);

const entryAtomsByPlatform = playerPlatforms.reduce(
	(entriesByPlatform, platform) => {
		const getInitialEntries = (): Entry[] => [
			{
				countAtom: atom(INITIAL_ENTRY_COUNT),
				timeMs: INITIAL_ENTRY_TIME_MS,
				noteAtom: atom(INITIAL_ENTRY_NOTE),
				isCurrentAtom: atom(true),
			},
		];

		const entryTimes = new Set([INITIAL_ENTRY_TIME_MS]);

		const entriesAtom = atom(getInitialEntries());

		const addAtom = atom(null, (get: Getter, set: Setter, timeMs: number) => {
			if (entryTimes.has(timeMs)) return;

			const entries = get(entriesAtom);
			for (const entry of entries) set(entry.isCurrentAtom, false);
			const index = findEntryIndex(entries, timeMs);
			const count = guessCountForIndex(get, entries, index, timeMs);
			const newEntry: Entry = {
				countAtom: atom(count),
				timeMs,
				noteAtom: atom(""),
				isCurrentAtom: atom(true),
			};

			const newEntries = [
				...entries.slice(0, index),
				newEntry,
				...entries.slice(index),
			];

			entryTimes.add(timeMs);
			set(entriesAtom, newEntries);
		});

		const removeAtom = atom(null, (get: Getter, set: Setter, index: number) => {
			const entries = get(entriesAtom);
			const newEntries = [...entries];
			const [removed] = newEntries.splice(index, 1);
			entryTimes.delete(removed.timeMs);

			set(entriesAtom, newEntries);
		});

		const clearAtom = atom(null, (_: Getter, set: Setter) => {
			set(entriesAtom, getInitialEntries());
			entryTimes.clear();
			entryTimes.add(INITIAL_ENTRY_TIME_MS);
		});

		const currentIndexAtom = atom(
			null,
			(get: Getter, set: Setter, timeMs: number) => {
				const entries = get(entriesAtom);

				let foundNext = false;
				for (let i = entries.length - 1; i > -1; i--) {
					const entry = entries[i];
					const entryTime = entry.timeMs;

					if (!foundNext && entryTime <= timeMs) {
						set(entry.isCurrentAtom, true);
						const cb = get(onIndexChangeAtom);
						cb?.[0](i);
						foundNext = true;
					} else {
						set(entry.isCurrentAtom, false);
					}
				}
			},
		);

		entriesByPlatform[platform] = {
			entriesAtom,
			addAtom,
			removeAtom,
			clearAtom,
			currentIndexAtom,
		};

		return entriesByPlatform;
	},
	{} as Record<PlayerPlatform, PlatformEntryAtoms>,
);

const findEntryIndex = (
	entries: Entry[],
	timeMs: number,
	start = 0,
	end = -1,
): number => {
	let s = start;
	let e = end > -1 ? end : entries.length;

	while (s !== e) {
		const pivot = ((e - s) >> 1) + s;
		if (entries[pivot].timeMs > timeMs) e = pivot;
		else s = pivot + 1;
	}

	return s;
};

const guessCountForIndex = (
	get: Getter,
	entries: Entry[],
	index: number,
	timeMs: number,
): number => {
	const sliceStartIndex = index - 2 < 0 ? 0 : index - 2;
	const priorTwo = entries.slice(sliceStartIndex, index);

	if (!priorTwo.length) return 0;

	if (priorTwo.length === 1) return get(priorTwo[0].countAtom);

	const [first, second] = priorTwo;
	const prevCountDeltaMs = get(second.countAtom) - get(first.countAtom);

	if (prevCountDeltaMs <= 0) return get(second.countAtom);

	const prevTimeDeltaMs = second.timeMs - first.timeMs;
	const countLengthMs = prevTimeDeltaMs / prevCountDeltaMs;
	const timeDeltaMs = timeMs - second.timeMs;
	const countDelta = Math.round(timeDeltaMs / countLengthMs);

	return countDelta + get(second.countAtom);
};
