import Papa from "papaparse";
import { atom } from "jotai";
import type { Getter, PrimitiveAtom, Setter, WritableAtom } from "jotai";

import { platformAtom, platforms, type Platform } from "~/lib/atoms";

export type Entry = {
	count: number;
	timeMs: number;
	note: string;
};

export type AtomicEntry = {
	index: number;
	countAtom: WritableAtom<number, [number], void>;
	timeMs: number;
	noteAtom: PrimitiveAtom<string>;
	isCurrentAtom: PrimitiveAtom<boolean>;
	countFillAtom: WritableAtom<boolean, [], void>;
};

type PlatformEntryAtoms = {
	entriesAtom: PrimitiveAtom<AtomicEntry[]>;
	addAtom: WritableAtom<null, [number], void>;
	removeAtom: WritableAtom<null, [number], void>;
	clearAtom: WritableAtom<null, [], void>;
	currentIndexAtom: WritableAtom<null, [number], void>;
	saveToCSVAtom: WritableAtom<null, [string], void>;
	loadFromCSVAtom: WritableAtom<null, [File], Promise<void>>;
};

type ScrollCallback = (currentIndex: number) => void;

// Function is wrapped in array here bc jotai doesn't support functions as values
const onIndexChangeAtom = atom<[ScrollCallback]>();
export const setOnIndexChangeAtom = atom(null, (_, set, cb: ScrollCallback) =>
	set(onIndexChangeAtom, [cb]),
);

export const entryAtomsForPlatform = atom(
	(get) => entryAtomsByPlatform[get(platformAtom)],
);

const createEntryAtoms = () => {
	const lastEditedTimeMsAtom = atom(0);

	const makeAtomicEntry = (
		entry: Entry & { isCurrent?: boolean },
		index: number,
	): AtomicEntry => {
		const { timeMs, count } = entry;
		const countSrcAtom = atom(count);
		const countAtom = atom(
			(get) => get(countSrcAtom),
			(_, set, count: number) => {
				set(countSrcAtom, count);
				set(lastEditedTimeMsAtom, timeMs);
			},
		);

		const countFillAtom = atom(
			(get) => {
				if (timeMs !== get(lastEditedTimeMsAtom)) return false;

				const entries = get(entriesAtom);
				const prevEntry = entries[index - 1];
				const nextEntry = entries[index + 1];
				if (!prevEntry || !nextEntry) return false;
				const countMs = getCountMs(get, prevEntry, { timeMs, countAtom });
				if (!countMs) return false;
				const nextTimeDelta = nextEntry.timeMs - timeMs;
				const expectedCountDelta = Math.round(nextTimeDelta / countMs);

				return get(nextEntry.countAtom) - entry.count !== expectedCountDelta;
			},
			(get, set) => {
				const entries = get(entriesAtom);

				for (let i = index + 1; i < entries.length; i++) {
					const entry = entries[i];
					const count = guessCountForIndex(get, entries, i, entry.timeMs);
					set(entry.countAtom, count);
				}
			},
		);

		return {
			index,
			countAtom,
			timeMs: entry.timeMs,
			noteAtom: atom(entry.note),
			isCurrentAtom: atom(entry.isCurrent || false),
			countFillAtom,
		};
	};

	const getInitialEntries = (set?: Setter) => {
		const initialEntries = [
			makeAtomicEntry({ count: 0, timeMs: 0, note: "Start" }, 0),
		];
		entryByTime = Object.fromEntries(initialEntries.map((e) => [e.timeMs, e]));

		if (set) set(lastEditedTimeMsAtom, 0);

		return initialEntries;
	};

	let entryByTime: Record<string, AtomicEntry>;

	const entriesAtom = atom(getInitialEntries());

	const addAtom = atom(null, (get: Getter, set: Setter, timeMs: number) => {
		if (timeMs in entryByTime) return;

		const entries = get(entriesAtom);
		for (const entry of entries) set(entry.isCurrentAtom, false);
		const index = findEntryIndex(entries, timeMs);
		const count = guessCountForIndex(get, entries, index, timeMs);
		const newEntry: AtomicEntry = makeAtomicEntry(
			{
				count,
				timeMs,
				note: "",
				isCurrent: true,
			},
			index,
		);

		const newEntries = [
			...entries.slice(0, index),
			newEntry,
			...entries.slice(index),
		];

		entryByTime[timeMs] = newEntry;
		set(entriesAtom, newEntries);
	});

	const removeAtom = atom(null, (get: Getter, set: Setter, index: number) => {
		const entries = get(entriesAtom);
		let removed: AtomicEntry;

		if (entries.length === 1) {
			if (!entries[0].timeMs) return;
			removed = entries[0];
			set(entriesAtom, getInitialEntries(set));
		} else {
			const newEntries = [...entries];
			removed = newEntries.splice(index, 1)[0];
			for (let i = index + 1; i < newEntries.length; i++) {
				newEntries[i].index = i;
			}
			set(entriesAtom, newEntries);
		}

		if (removed) delete entryByTime[removed.timeMs];
	});

	const clearAtom = atom(null, (_: Getter, set: Setter) => {
		set(entriesAtom, getInitialEntries(set));
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

	const saveToCSVAtom = atom(null, (get, _, fileName: string) => {
		const jsonableEntries = get(entriesAtom).map((atomic) => ({
			count: get(atomic.countAtom),
			timeMs: atomic.timeMs,
			note: get(atomic.noteAtom),
		}));

		saveToCSV(fileName, jsonableEntries);
	});

	const loadFromCSVAtom = atom(null, async (_, set, file: File) => {
		const entries = await loadFromCSV(file);
		set(entriesAtom, entries.map(makeAtomicEntry));
	});

	return {
		entriesAtom,
		addAtom,
		removeAtom,
		clearAtom,
		currentIndexAtom,
		saveToCSVAtom,
		loadFromCSVAtom,
	};
};

const entryAtomsByPlatform = platforms.reduce(
	(entriesByPlatform, platform) => {
		entriesByPlatform[platform] = createEntryAtoms();
		return entriesByPlatform;
	},
	{} as Record<Platform, PlatformEntryAtoms>,
);

const findEntryIndex = (
	entries: AtomicEntry[],
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
	entries: AtomicEntry[],
	index: number,
	timeMs: number,
): number => {
	const sliceStartIndex = index - 2 < 0 ? 0 : index - 2;
	const priorTwo = entries.slice(sliceStartIndex, index);

	if (!priorTwo.length) return 0;

	if (priorTwo.length === 1) return get(priorTwo[0].countAtom);

	const [first, second] = priorTwo;

	const countLengthMs = getCountMs(get, first, second);
	if (!countLengthMs) return get(second.countAtom);

	const timeDeltaMs = timeMs - second.timeMs;
	const countDelta = Math.round(timeDeltaMs / countLengthMs);

	return countDelta + get(second.countAtom);
};

const getCountMs = <
	F extends Pick<AtomicEntry, "countAtom" | "timeMs">,
	S extends Pick<AtomicEntry, "countAtom" | "timeMs">,
>(
	get: Getter,
	first: F,
	second: S,
) => {
	const countDelta = get(second.countAtom) - get(first.countAtom);
	if (countDelta <= 0) return 0;
	const msDelta = second.timeMs - first.timeMs;
	return Math.round(msDelta / countDelta);
};

const saveToCSV = (fileName: string, entries: Entry[]) => {
	const csv = Papa.unparse(entries, { quotes: true });
	const file = new Blob([csv], { type: "text/csv" });
	const $a = document.createElement("a");
	const url = URL.createObjectURL(file);
	$a.href = url;
	$a.download = `${fileName}.csv`;
	$a.style.height = "0";
	document.body.appendChild($a);
	$a.click();
	setTimeout(() => {
		document.body.removeChild($a);
		window.URL.revokeObjectURL(url);
	}, 0);
};

const loadFromCSV = async (file: File) => {
	const csv = await file.text();
	const result = Papa.parse<Entry>(csv, { header: true, dynamicTyping: true });
	if (result.errors.length) {
		alert(`CSV had errors ${result.errors}`);
		return [];
	}
	return result.data;
};
