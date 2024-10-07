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

type CountFillAtom = WritableAtom<boolean, [boolean?], void>;

export type AtomicEntry = {
	countAtom: WritableAtom<number, [number, boolean?], void>;
	timeMs: number;
	noteAtom: PrimitiveAtom<string>;
	isCurrentAtom: PrimitiveAtom<boolean>;
	countFillAtom: CountFillAtom;
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

type ScrollCallback = (currentIndex: number) => void;

// Function is wrapped in array here bc jotai doesn't support functions as values
const onIndexChangeAtom = atom<[ScrollCallback]>();
export const setOnIndexChangeAtom = atom(null, (_, set, cb: ScrollCallback) =>
	set(onIndexChangeAtom, [cb]),
);

export const useInitializedEntries = () => {
	const [platformEntryAtoms] = useAtom(entryAtomsForPlatformAtom);
	const [, initializeEntries] = useAtom(platformEntryAtoms.entriesAtom);

	useLayoutEffect(() => {
		initializeEntries();
	}, [initializeEntries]);

	return platformEntryAtoms;
};

// Can't easily export contained atoms because most are WritableAtom's
// with function signatures that must be replicated in when creating a
// new atom
export const entryAtomsForPlatformAtom = atom(
	(get) => entryAtomsByPlatform[get(platformAtom)],
);

declare global {
	interface Window {
		atoms: Record<
			Platform,
			{ currentCountFillAtomAtom: PrimitiveAtom<CountFillAtom> }
		>;
	}
}

window.atoms = {} as Window["atoms"];

const createPlatformEntryAtoms = (platform: Platform): PlatformEntryAtoms => {
	const currentCountFillAtomAtom = atom(atom(false) as CountFillAtom);
	const currentIsCurrentAtomAtom = atom(atom(false) as PrimitiveAtom<boolean>);

	// For debugging
	window.atoms[platform] = { currentCountFillAtomAtom };

	const entriesSrcAtom = atom<AtomicEntry[]>([]);

	const makeAtomicEntry = getAtomicEntryMaker(
		entriesSrcAtom,
		currentCountFillAtomAtom,
	);

	const entriesAtom = atom(
		(get) => get(entriesSrcAtom),
		(get, set, entryInputs?: EntryInput[] | false) => {
			let newInputs: EntryInput[];

			if (!entryInputs || !entryInputs.length) {
				if (entryInputs === undefined && get(entriesSrcAtom).length) return;
				newInputs = [{ timeMs: 0, note: "Start", isCurrent: true }];
			} else newInputs = entryInputs;

			const newEntries = newInputs.map(makeAtomicEntry);

			set(entriesSrcAtom, newEntries);
			set(currentCountFillAtomAtom, newEntries[0].countFillAtom);
		},
	) as WritableAtom<AtomicEntry[], [initial?: EntryInput[] | false], void>;

	const addAtom = atom(null, (get: Getter, set: Setter, timeMs: number) => {
		const entries = get(entriesSrcAtom);
		const index = findEntryIndex(entries, timeMs);

		if (entries[index]?.timeMs === timeMs) return;

		for (const entry of entries) set(entry.isCurrentAtom, false);
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

		set(entriesSrcAtom, newEntries);
	});

	const removeAtom = atom(null, (get: Getter, set: Setter, index: number) => {
		const entries = get(entriesAtom);
		let removed: AtomicEntry;

		if (entries.length === 1) {
			if (!entries[0].timeMs) return;
			set(entriesAtom, false);
		} else {
			const newEntries = [...entries];
			newEntries.splice(index, 1)[0];
			set(entriesSrcAtom, newEntries);
		}
	});

	const clearAtom = atom(null, (_: Getter, set: Setter) => {
		set(entriesAtom, false);
	});

	const currentIndexAtom = atom(
		null,
		(get: Getter, set: Setter, timeMs: number) => {
			const entries = get(entriesAtom);
			const index = findHighlightIndex(entries, timeMs);

			const nextEntry = entries[index];
			const currentIsCurrentAtom = get(currentIsCurrentAtomAtom);

			if (nextEntry.isCurrentAtom === currentIsCurrentAtom) return;

			(get(onIndexChangeAtom) as [ScrollCallback])[0](index);
			set(currentIsCurrentAtom, false);
			set(nextEntry.isCurrentAtom, true);
			set(currentIsCurrentAtomAtom, nextEntry.isCurrentAtom);
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

export type EntryInput = Partial<Omit<Entry, "timeMs">> & {
	timeMs: number;
	isCurrent?: boolean;
};

const getAtomicEntryMaker =
	(
		entriesAtom: Atom<AtomicEntry[]>,
		currentCountFillAtomAtom: PrimitiveAtom<CountFillAtom>,
	) =>
	(entry: EntryInput, index: number): AtomicEntry => {
		const countSrcAtom = atom(entry.count || 0);
		const countAtom = atom(
			(get) => get(countSrcAtom),
			(get, set, count: number, isFill?: boolean) => {
				set(countSrcAtom, count);
				if (isFill) return;

				if (getDoCountsAlign(get, entriesAtom, index)) return;

				set(get(currentCountFillAtomAtom), false);
				set(countFillAtom, true);
				set(currentCountFillAtomAtom, countFillAtom);
			},
		);

		const countFillSrcAtom = atom(false);
		const countFillAtom: CountFillAtom = atom(
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
			countAtom,
			timeMs: entry.timeMs,
			noteAtom: atom(entry.note || ""),
			isCurrentAtom: atom(entry.isCurrent || false),
			countFillAtom,
		};
	};

const entryAtomsByPlatform = platforms.reduce(
	(entriesByPlatform, platform) => {
		entriesByPlatform[platform] = createPlatformEntryAtoms(platform);
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
	entries: { timeMs: number }[],
	timeMs: number,
): number => {
	let s = 0;
	let e = entries.length;

	while (s !== e) {
		const pivot = ((e - s) >> 1) + s;
		const pivotTime = entries[pivot].timeMs;
		if (pivotTime === timeMs) return pivot;
		if (timeMs < pivotTime) e = pivot;
		else s = pivot + 1;
	}

	return s;
};

const findHighlightIndex = (
	entries: { timeMs: number }[],
	timeMs: number,
): number => {
	let s = 0;
	let e = entries.length;
	const lastIndex = e - 1;

	if (timeMs > entries[lastIndex].timeMs) return lastIndex;

	while (s !== e) {
		const pivot = ((e - s) >> 1) + s;
		const pivotTime = entries[pivot]?.timeMs;
		if (timeMs === pivotTime) return pivot;
		if (timeMs < pivotTime) e = pivot - 1;
		else s = pivot;
	}

	return e;
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
