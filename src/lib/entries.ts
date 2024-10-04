import Papa from "papaparse";
import { atom, useAtom } from "jotai";
import type { Atom, Getter, PrimitiveAtom, Setter, WritableAtom } from "jotai";
import { useLayoutEffect } from "react";

import { platformAtom, platforms, type Platform } from "~/lib/platformAtoms";

export type Entry = {
	count: number;
	timeMs: number;
	note: string;
};

export type AtomicEntry = {
	index: number;
	countAtom: WritableAtom<number, [number, boolean?], void>;
	timeMs: number;
	noteAtom: PrimitiveAtom<string>;
	isCurrentAtom: PrimitiveAtom<boolean>;
	countFillAtom: WritableAtom<boolean, [], void>;
};

type PlatformEntryAtoms = {
	entriesAtom: WritableAtom<AtomicEntry[], [initial?: EntryInput[]], void>;
	addAtom: WritableAtom<null, [number], void>;
	removeAtom: WritableAtom<null, [number], void>;
	clearAtom: WritableAtom<null, [], void>;
	currentIndexAtom: WritableAtom<null, [number], void>;
	saveToCSVAtom: WritableAtom<null, [string], void>;
	loadFromCSVAtom: WritableAtom<null, [File], Promise<void>>;
};

type WritableBoolAtom = WritableAtom<boolean, [boolean], void>;

type ScrollCallback = (currentIndex: number) => void;

// Function is wrapped in array here bc jotai doesn't support functions as values
const onIndexChangeAtom = atom<[ScrollCallback]>();
export const setOnIndexChangeAtom = atom(null, (_, set, cb: ScrollCallback) =>
	set(onIndexChangeAtom, [cb]),
);

export const useInitializedEntries = () => {
	const [entryAtoms] = useAtom(entryAtomsForPlatformAtom);
	const [, initializeEntries] = useAtom(entryAtoms.entriesAtom);

	useLayoutEffect(() => {
		initializeEntries();
	}, []);

	return entryAtoms;
};

// Can't easily export contained atoms because most are WritableAtom's
// with function signatures that must be replicated in when creating a
// new atom
export const entryAtomsForPlatformAtom = atom(
	(get) => entryAtomsByPlatform[get(platformAtom)],
);

const createPlatformEntryAtoms = (): PlatformEntryAtoms => {
	type EntryByTime = Record<number, AtomicEntry>;

	const entryByTimeAtom = atom<EntryByTime>() as WritableAtom<
		EntryByTime,
		[EntryByTime],
		void
	>;

	const currentCountFillAtom = atom(atom(false) as WritableBoolAtom);

	const entriesSrcAtom = atom<AtomicEntry[]>([]);

	const makeAtomicEntry = getAtomicEntryMaker(
		entriesSrcAtom as PrimitiveAtom<AtomicEntry[]>,
		currentCountFillAtom,
	);

	const entriesAtom = atom(
		(get) => get(entriesSrcAtom),
		(get, set, initial?: EntryInput[] | false) => {
			let newInput: EntryInput[];

			if (!initial) {
				if (initial === undefined && get(entriesSrcAtom).length) return;
				newInput = [{ timeMs: 0, note: "Start", isCurrent: true }];
			} else newInput = initial;

			const newEntries = newInput.map(makeAtomicEntry);

			set(entriesSrcAtom, newEntries);
			set(currentCountFillAtom, newEntries[0].countFillAtom);
			set(
				entryByTimeAtom,
				Object.fromEntries(newEntries.map((e) => [e.timeMs, e])),
			);
		},
	) as WritableAtom<AtomicEntry[], [initial?: EntryInput[] | false], void>;

	const addAtom = atom(null, (get: Getter, set: Setter, timeMs: number) => {
		if (timeMs in get(entryByTimeAtom)) return;

		const entries = get(entriesSrcAtom);
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

		get(entryByTimeAtom)[timeMs] = newEntry;
		set(entriesSrcAtom, newEntries);
	});

	const removeAtom = atom(null, (get: Getter, set: Setter, timeMs: number) => {
		const entries = get(entriesAtom);
		const toRemove = get(entryByTimeAtom)[timeMs];
		const { index } = toRemove;

		if (entries.length === 1) {
			if (!entries[0].timeMs) return;
			set(entriesAtom, false);
		} else {
			const newEntries = [...entries];
			newEntries.splice(index, 1);
			for (let i = index + 1; i < newEntries.length; i++) {
				newEntries[i].index = i;
			}
			set(entriesSrcAtom, newEntries);
		}

		delete get(entryByTimeAtom)[toRemove.timeMs];
	});

	const clearAtom = atom(null, (_: Getter, set: Setter) => {
		set(entriesAtom, false);
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
		set(entriesSrcAtom, entries.map(makeAtomicEntry));
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

type EntryInput = Partial<Omit<Entry, "timeMs">> & {
	timeMs: number;
	isCurrent?: boolean;
};

const getAtomicEntryMaker =
	(
		entriesAtom: Atom<AtomicEntry[]>,
		currentCountFillAtom: WritableAtom<
			WritableBoolAtom,
			[WritableBoolAtom],
			void
		>,
	) =>
	(entry: EntryInput, index: number): AtomicEntry => {
		const countSrcAtom = atom(entry.count || 0);
		const countAtom = atom(
			(get) => get(countSrcAtom),
			(get, set, count: number, isFill?: boolean) => {
				set(countSrcAtom, count);
				if (isFill) return;

				if (getDoCountsAlign(get, entriesAtom, index)) return;

				set(get(currentCountFillAtom), false);
				set(countFillAtom, true);
				set(currentCountFillAtom, countFillAtom as WritableBoolAtom);
			},
		);

		const countFillSrcAtom = atom(false);
		const countFillAtom = atom(
			(get) => get(countFillSrcAtom),
			(get, set, canFill?: boolean) => {
				if (canFill !== undefined) return set(countFillSrcAtom, canFill);

				set(countFillSrcAtom, false);
				const entries = get(entriesAtom);

				for (let i = index + 1; i < entries.length; i++) {
					const entry = entries[i];
					const count = guessCountForIndex(get, entries, i, entry.timeMs);
					set(entry.countAtom, count, true);
				}
			},
		);

		return {
			index,
			countAtom,
			timeMs: entry.timeMs,
			noteAtom: atom(entry.note || ""),
			isCurrentAtom: atom(entry.isCurrent || false),
			countFillAtom,
		};
	};

const entryAtomsByPlatform = platforms.reduce(
	(entriesByPlatform, platform) => {
		entriesByPlatform[platform] = createPlatformEntryAtoms();
		return entriesByPlatform;
	},
	{} as Record<Platform, PlatformEntryAtoms>,
);

const getDoCountsAlign = (
	get: Getter,
	entriesAtom: Atom<AtomicEntry[]>,
	index: number,
) => {
	const entries = get(entriesAtom);
	const entry = entries[index];
	const prevEntry = entries[index - 1];
	const nextEntry = entries[index + 1];
	if (!prevEntry || !nextEntry) return true;
	const prevCountMs = getCountMs(get, prevEntry, entry);
	if (!prevCountMs) return true;
	const nextTimeDelta = nextEntry.timeMs - entry.timeMs;
	const expectedCountDelta = Math.round(nextTimeDelta / prevCountMs);

	return get(nextEntry.countAtom) - get(entry.countAtom) === expectedCountDelta;
};

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

type CountAndTime = Pick<AtomicEntry, "countAtom" | "timeMs">;

const getCountMs = <F extends CountAndTime, S extends CountAndTime>(
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
		$a.remove();
		window.URL.revokeObjectURL(url);
	}, 1);
};

const loadFromCSV = async (file: File) => {
	const csv = await file.text();
	const result = Papa.parse<Entry>(csv, { header: true, dynamicTyping: true });
	if (result.errors.length) {
		alert(`CSV had errors ${result.errors.map((e) => e.message).join("\r\n")}`);
		return [];
	}
	return result.data;
};
