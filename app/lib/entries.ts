import { useState, useEffect, useRef, useMemo, createContext } from "react";
import type { MutableRefObject } from "react";
import Papa from "papaparse";

import type { WrappedPlayer } from "./spotify";

export type Entry = { meter: number; timeMs: number; note: string };

type EntryWithHighlight = {
	entry: Entry;
	highlighter?: (flag: boolean) => void;
};

const entriesSet: Set<number> = new Set<number>();
let entriesWithHighlight: EntryWithHighlight[];

const loadEntries = (entries?: Entry[]) => {
	const nonEmptyEntries = entries || [{ meter: 0, timeMs: 0, note: "Start" }];
	entriesSet.clear();
	for (const entry of nonEmptyEntries) entriesSet.add(entry.timeMs);
	entriesWithHighlight = nonEmptyEntries.map((entry: Entry) => ({ entry }));
};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const debounced = (fn: (...rest: any[]) => void, timeMs: number) => {
	let timeoutId = 0;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	return (...args: any[]) => {
		clearTimeout(timeoutId);
		timeoutId = window.setTimeout(() => fn(...args), timeMs);
	};
};

loadEntries();

const getEntries = () => entriesWithHighlight.map(({ entry }) => entry);

const saveToCSV = (trackName: string) => {
	const entries = getEntries();
	const csv = Papa.unparse(entries);
	const file = new Blob([csv], { type: "text/csv" });
	const $a = document.createElement("a");
	const url = URL.createObjectURL(file);
	$a.href = url;
	$a.download = `${trackName}.csv`;
	$a.style.height = "0";
	document.body.appendChild($a);
	$a.click();
	setTimeout(() => {
		document.body.removeChild($a);
		window.URL.revokeObjectURL(url);
	}, 0);
};

const loadEntriesFromCSV = async (file: File) => {
	const csv = await file.text();
	const result = Papa.parse(csv, { header: true, dynamicTyping: true });
	if (result.errors.length) return alert(`CSV had errors ${result.errors}`);
	loadEntries(result.data as Entry[]);
	storeEntriesLocally();
};

// This could become wrong if an entry gets inserted before this index
let highlightedIndex: number;

const getHighlightCurrentEntry =
	(
		scrollRef: MutableRefObject<HTMLElement | undefined>,
		containerRef: MutableRefObject<HTMLElement | undefined>,
	) =>
	(timeMs: number) => {
		if (!entriesWithHighlight.length) return;

		let newIndex = undefined;
		const currentEntry = entriesWithHighlight[highlightedIndex]?.entry;

		if (currentEntry && timeMs >= currentEntry.timeMs) {
			const nextEntry = entriesWithHighlight[highlightedIndex + 1]?.entry;
			// Most common case: Still in the same entry
			if (nextEntry) {
				if (timeMs < nextEntry.timeMs) newIndex = highlightedIndex;
				else {
					const nextNextEntry =
						entriesWithHighlight[highlightedIndex + 2]?.entry;
					const isNextEntry =
						nextNextEntry &&
						timeMs >= nextEntry.timeMs &&
						timeMs < nextNextEntry.timeMs;
					if (isNextEntry) newIndex = highlightedIndex + 1;
				}
			}
		}

		if (newIndex === undefined) newIndex = findEntryIndex(timeMs) - 1;

		if (newIndex !== highlightedIndex) {
			entriesWithHighlight[highlightedIndex]?.highlighter?.(false);
			entriesWithHighlight[newIndex]?.highlighter?.(true);
		}

		highlightedIndex = newIndex;

		setEntriesScrollPosition(scrollRef, containerRef, newIndex);
	};

const STORAGE_KEY = "choreo-entries";
const loadEntriesFromLocalStorage = () => {
	const data = localStorage.getItem(STORAGE_KEY);
	const stored = data ? JSON.parse(data) : null;
	if (stored?.length) loadEntries(stored);
};
const storeEntriesLocally = () => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(getEntries()));
};

const debouncedStoreEntriesLocally = debounced(storeEntriesLocally, 2000);

export type MeterDialogData = { timeMs: number; defaultMeter: number };

export const useEntries = (player: WrappedPlayer | undefined) => {
	const scrollerRef = useRef<HTMLElement>();
	const containerRef = useRef<HTMLElement>();
	const [renderState, render] = useRender();

	useEffect(() => {
		loadEntriesFromLocalStorage();
		render();
		return () => storeEntriesLocally();
	}, []);

	useEffect(() => {
		if (!player) return;

		const cb = getHighlightCurrentEntry(scrollerRef, containerRef);
		if (entriesWithHighlight.length) player.addOnTick(cb);
		return () => player.removeOnTick(cb);
	}, [!!player, !!entriesWithHighlight.length]);

	const addEntry = (timeMs: number) => {
		if (entriesSet.has(timeMs)) return;

		const index = findEntryIndex(timeMs);

		if (index === entriesWithHighlight.length) {
			const $scroller = scrollerRef.current;
			if ($scroller) $scroller.scrollTop = $scroller.scrollHeight;
		}

		const meter = guessMeterForIndex(index, timeMs);
		const newEntry = { entry: { meter, timeMs, note: "" } };
		entriesWithHighlight.splice(index, 0, newEntry);
		entriesSet.add(timeMs);
		debouncedStoreEntriesLocally();
		render();
	};

	const removeEntry = (index: number) => {
		const [removed] = entriesWithHighlight.splice(index, 1);
		entriesSet.delete(removed.entry.timeMs);
		debouncedStoreEntriesLocally();
		render();
	};

	const loadFromCSV = async (file: File) => {
		await loadEntriesFromCSV(file);
		render();
	};

	const clear = () => {
		loadEntries();
		storeEntriesLocally();
		render();
	};

	return useMemo(
		() => ({
			entries: entriesWithHighlight.map(({ entry }) => entry),
			scrollerRef,
			containerRef,
			addEntry,
			removeEntry,
			saveToCSV,
			loadFromCSV,
			clear,
		}),
		[renderState],
	);
};

export const EntriesContext = createContext(
	{} as ReturnType<typeof useEntries>,
);

const findEntryIndex = (timeMs: number, start = 0, end = -1): number => {
	const posEnd = end > -1 ? end : entriesWithHighlight.length;
	if (start === posEnd) return start;
	const pivot = ((posEnd - start) >> 1) + start;
	if (entriesWithHighlight[pivot].entry.timeMs > timeMs)
		return findEntryIndex(timeMs, start, pivot);
	return findEntryIndex(timeMs, pivot + 1, posEnd);
};

export const useEntry = (index: number) => {
	const entryWithHighlight = entriesWithHighlight[index];
	const { entry } = entryWithHighlight;

	const [isHighlighted, setIsHighlighted] = useState(false);
	const render = useRender()[1];

	useEffect(() => {
		entryWithHighlight.highlighter = setIsHighlighted;
	}, [entryWithHighlight]);

	const setMeter = (meter: number) => {
		entry.meter = meter;
		debouncedStoreEntriesLocally();
		render();
	};

	const setTimeMs = (timeMs: number) => {
		entry.timeMs = timeMs;
		debouncedStoreEntriesLocally();
		render();
	};

	const setNote = (note: string) => {
		entry.note = note;
		debouncedStoreEntriesLocally();
		render();
	};

	return { ...entry, setMeter, setTimeMs, setNote, isHighlighted };
};

const useRender = (): [number, (input?: number) => void] => {
	const [state, setState] = useState(0);

	useEffect(() => {
		return () => {};
	}, []);

	return [state, (input?: number) => setState(input ? input : (p) => p + 1)];
};

const guessMeterForIndex = (index: number, timeMs: number) => {
	const priorTwo = entriesWithHighlight.slice(index - 2, index);
	const priorCount = priorTwo.length;
	const hasTwo = priorTwo.length === 2;
	if (priorCount) {
		const first = (hasTwo ? priorTwo[0] : null)?.entry;
		const second = priorTwo[hasTwo ? 1 : 0].entry;
		if (!hasTwo && !second.timeMs) return second.meter;
		const prevTimeDeltaMs = second.timeMs - (first?.timeMs || 0);
		const prevMeterDeltaMs = second.meter - (first?.meter || 0);
		const meterLengthMs = prevTimeDeltaMs / prevMeterDeltaMs;
		const timeDeltaMs = timeMs - second.timeMs;
		const meterDelta = Math.round(timeDeltaMs / meterLengthMs);
		return second.meter + meterDelta;
	}
	return 0;
};

const setEntriesScrollPosition = (
	scrollRef: MutableRefObject<HTMLElement | undefined>,
	containerRef: MutableRefObject<HTMLElement | undefined>,
	newIndex: number,
) => {
	const $scroller = scrollRef.current;
	if ($scroller) {
		const $child = containerRef.current?.childNodes[newIndex] as HTMLElement;
		if (!$child) return;
		const oldTop = $scroller.scrollTop;
		const childBottom = $child.offsetTop + $child.clientHeight;
		if (childBottom > oldTop + $scroller.clientHeight) {
			const halfClient = $scroller.clientHeight >> 1;
			const newTop = $child.offsetTop - halfClient;
			$scroller.scrollTo(0, newTop);
		}
	}
};
