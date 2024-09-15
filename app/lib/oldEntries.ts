import { atom, useAtom } from "jotai";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Papa from "papaparse";

import { debounced } from "./utils";
import { playerAtom } from "./atoms";

export type Entry = { count: number; timeMs: number; note: string };

export type EntryWithHighlight = {
	entry: Entry;
	highlighter?: (flag: boolean) => void;
};

export type EntriesData = ReturnType<typeof useEntries>;

const entriesDataAtom = atom<EntriesData>();
export const _TESTING_ONLY_setEntriesData = atom(
	null,
	(_, set, entriesData: EntriesData) => set(entriesDataAtom, entriesData),
);

export const useSetUpEntries = () => {
	const entries = useEntries();
	const [, setEntries] = useAtom(entriesDataAtom);

	useEffect(() => {
		setEntries(entries);
	}, [entries, setEntries]);
};

export const useEntriesData = () => useAtom(entriesDataAtom)[0] as EntriesData;

export const ENTRIES_STORAGE_KEY = "choreo-entries";

export const useEntries = () => {
	const [player] = useAtom(playerAtom);
	const entriesSetRef = useRef(new Set<number>());
	const entriesWithHighlightRef = useRef<EntryWithHighlight[]>([]);
	const highlightIndexRef = useRef<number>();
	const scrollerRef = useRef<HTMLElement>();
	const containerRef = useRef<HTMLElement>();

	const [renderState, render] = useRender();

	const { current: entriesSet } = entriesSetRef;

	const loadEntriesFromLocalStorage = useCallback(() => {
		const data = localStorage.getItem(ENTRIES_STORAGE_KEY);
		const stored = data ? JSON.parse(data) : null;
		loadEntries(stored?.length ? stored : undefined);
	}, []);

	useEffect(() => {
		loadEntriesFromLocalStorage();
		render();
		return () => storeEntriesLocally();
	}, [loadEntriesFromLocalStorage, render]);

	useEffect(() => {
		if (!player) return;
		highlightIndexRef.current = undefined;
		player.addOnTick(highlightCurrentEntry);
		return () => player.removeOnTick(highlightCurrentEntry);
	}, [player]);

	const loadEntries = (entries?: Entry[]) => {
		const nonEmptyEntries = entries || [{ count: 0, timeMs: 0, note: "Start" }];
		entriesSet.clear();
		for (const entry of nonEmptyEntries) entriesSet.add(entry.timeMs);
		entriesWithHighlightRef.current = nonEmptyEntries.map((entry: Entry) => ({
			entry,
		}));
	};

	const storeEntriesLocally = () => {
		localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(getEntries()));
	};

	const getEntries = () =>
		entriesWithHighlightRef.current.map(({ entry }) => entry);

	const highlightCurrentEntry = (timeMs: number) => {
		const entries = entriesWithHighlightRef.current;
		if (!entries.length) return;

		const { current: highlightIndex } = highlightIndexRef;
		const newIndex = getNewHighlightIndex(timeMs, highlightIndex);

		if (newIndex === highlightIndex) return;

		if (highlightIndex !== undefined)
			entries[highlightIndex]?.highlighter?.(false);
		entries[newIndex]?.highlighter?.(true);
		highlightIndexRef.current = newIndex;
		setEntriesScrollPosition(scrollerRef, containerRef, newIndex);
	};

	const getNewHighlightIndex = (
		timeMs: number,
		highlightIndex?: number,
	): number => {
		const entries = entriesWithHighlightRef.current;
		if (entries.length === 1) return 0;

		if (highlightIndex === undefined) return findHighlightIndex(timeMs);

		const highlightEntry = entries[highlightIndex];
		if (!highlightEntry) return findHighlightIndex(timeMs);

		if (timeMs < highlightEntry.entry.timeMs) {
			return findHighlightIndex(timeMs, 0, highlightIndex);
		}

		const nextEntry = entries[highlightIndex + 1];
		if (!nextEntry || timeMs < nextEntry.entry.timeMs) {
			return highlightIndex;
		}

		const nextNextEntry = entries[highlightIndex + 2];
		if (!nextNextEntry || timeMs < nextNextEntry.entry.timeMs) {
			return highlightIndex + 1;
		}

		return findHighlightIndex(timeMs, highlightIndex + 2);
	};

	const findHighlightIndex = (...args: Parameters<typeof findEntryIndex>) =>
		findEntryIndex(...args) - 1;

	const findEntryIndex = (timeMs: number, start = 0, end = -1): number => {
		const entries = entriesWithHighlightRef.current;
		let s = start;
		let e = end > -1 ? end : entries.length;

		while (s !== e) {
			const pivot = ((e - s) >> 1) + s;
			if (entries[pivot].entry.timeMs > timeMs) e = pivot;
			else s = pivot + 1;
		}

		return s;
	};

	const setHighlighter = (
		index: number,
		highlighter?: (isHighlighted: boolean) => void,
	) => {
		const entry = entriesWithHighlightRef.current[index];
		entry.highlighter = highlighter;
	};

	const debouncedStoreEntriesLocally = debounced(storeEntriesLocally, 2000);

	// FIXME: This can give negative numbers when adding entry between two
	//        entries that already have counts.
	const guessCountForIndex = (index: number, timeMs: number) => {
		const priorTwo = entriesWithHighlightRef.current.slice(index - 2, index);
		const priorCount = priorTwo.length;
		const hasTwo = priorTwo.length === 2;
		if (priorCount) {
			const first = (hasTwo ? priorTwo[0] : null)?.entry;
			const second = priorTwo[hasTwo ? 1 : 0].entry;
			if (!hasTwo && !second.timeMs) return second.count;
			const prevTimeDeltaMs = second.timeMs - (first?.timeMs || 0);
			const prevCountDeltaMs = second.count - (first?.count || 0);
			const countLengthMs = prevTimeDeltaMs / prevCountDeltaMs;
			const timeDeltaMs = timeMs - second.timeMs;
			const countDelta = Math.round(timeDeltaMs / countLengthMs);
			return second.count + countDelta;
		}
		return 0;
	};

	const addEntry = (timeMs: number) => {
		if (entriesSet.has(timeMs)) return;

		const index = findEntryIndex(timeMs);

		const count = guessCountForIndex(index, timeMs);
		const newEntry = { entry: { count, timeMs, note: "" } };
		entriesWithHighlightRef.current.splice(index, 0, newEntry);
		entriesSet.add(timeMs);
		debouncedStoreEntriesLocally();
		render();
	};

	const removeEntry = (index: number) => {
		const [removed] = entriesWithHighlightRef.current.splice(index, 1);
		entriesSet.delete(removed.entry.timeMs);
		debouncedStoreEntriesLocally();
		render();
	};

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

	const loadFromCSV = async (file: File) => {
		const csv = await file.text();
		const result = Papa.parse(csv, { header: true, dynamicTyping: true });
		if (result.errors.length) return alert(`CSV had errors ${result.errors}`);
		loadEntries(result.data as Entry[]);
		storeEntriesLocally();
		render();
	};

	const clear = () => {
		loadEntries();
		storeEntriesLocally();
		render();
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: functions always operate the same
	return useMemo(
		() => ({
			setHighlighter,
			entries: getEntries(),
			scrollerRef,
			containerRef,
			entryModified: debouncedStoreEntriesLocally,
			addEntry,
			removeEntry,
			saveToCSV,
			loadFromCSV,
			clear,
		}),
		[renderState],
	);
};

const setEntriesScrollPosition = (
	scrollRef: ElementRef,
	containerRef: ElementRef,
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

const useRender = (): [number, (input?: number) => void] => {
	const [state, setState] = useState(0);

	const render = useCallback(() => setState((p) => p + 1), []);

	return [state, render];
};
