import {
	useState,
	useCallback,
	useEffect,
	useRef,
	useMemo,
	createContext,
	useContext,
} from "react";
import type { WrappedPlayer } from "./spotify";
import Papa from "papaparse";

export type Entry = { meter: number; timeMs: number; note: string };
type EntryWithHighlight = {
	entry: Entry;
	highlighter?: (flag: boolean) => void;
};

let timeoutId = 0;
const debounced =
	(fn: Function) =>
	(...args) => {
		clearTimeout(timeoutId);
		timeoutId = window.setTimeout(() => fn(...args), 2000);
	};
let entriesWithHighlight: EntryWithHighlight[] = [];
const entriesSet: Set<number> = new Set<number>();
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

const loadFromCSVWithoutRender = async (file: File) => {
	const csv = await file.text();
	const result = Papa.parse(csv, { header: true, dynamicTyping: true });
	if (result.errors.length) return alert(`CSV had errors ${result.errors}`);
	loadEntries(result.data as Entry[]);
	storeEntriesLocally();
};

// This could become wrong if an entry get inserted before this index
let highlightedIndex: number;

const getHighlightEntry =
	(scrollRef: React.MutableRefObject<HTMLElement | undefined>) =>
	({ position }: Spotify.PlaybackState) => {
		if (!entriesWithHighlight.length) return;
		// Optimize for most common case: The next entry gets highlighted.
		const nextEntry = entriesWithHighlight[highlightedIndex + 1];
		const nextNextEntry = entriesWithHighlight[highlightedIndex + 2];
		const isNextEntry =
			nextEntry &&
			nextNextEntry &&
			nextEntry.entry.timeMs < position &&
			position < nextNextEntry.entry.timeMs;

		const newIndex = isNextEntry
			? highlightedIndex + 1
			: findEntryIndex(position) - 1;
		if (highlightedIndex === newIndex) return;
		entriesWithHighlight[newIndex]?.highlighter?.(true);
		entriesWithHighlight[highlightedIndex]?.highlighter?.(false);
		highlightedIndex = newIndex;
		const $scroller = scrollRef.current;
		if ($scroller) {
			const $child = $scroller.childNodes[newIndex] as HTMLElement;
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

const loadEntries = (entries: Entry[]) => {
	entriesWithHighlight = entries.map((entry: Entry) => ({ entry }));
};

const STORAGE_KEY = "choreo-entries";
const loadEntriesFromLocalStorage = () => {
	const data = localStorage.getItem(STORAGE_KEY);
	const stored = data ? JSON.parse(data) : null;
	if (stored) loadEntries(stored);
};
const storeEntriesLocally = () => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(getEntries()));
};

const debouncedStoreEntriesLocally = debounced(storeEntriesLocally);

export const useEntries = (player: WrappedPlayer) => {
	const scrollerRef = useRef<HTMLElement>();
	const [renderState, render] = useRender();

	useEffect(() => {
		loadEntriesFromLocalStorage();
		render();
		return () => storeEntriesLocally();
	}, []);

	useEffect(() => {
		const cb = getHighlightEntry(scrollerRef);
		if (entriesWithHighlight.length) player.addOnTick(cb);
		return () => player.removeOnTick(cb);
	}, [!!entriesWithHighlight.length]);

	const addEntry = (timeMs: number) => {
		if (entriesSet.has(timeMs)) return;
		const index = findEntryIndex(timeMs);
		const priorTwo = entriesWithHighlight.slice(index - 2, index);
		let meter = 0;
		if (priorTwo.length === 2) {
			const [first, second] = priorTwo.map(({ entry }) => entry);
			const prevTimeDelta = second.timeMs - first.timeMs;
			const prevMeterDelta = second.meter - first.meter;
			const meterLength = prevTimeDelta / prevMeterDelta;
			const timeDelta = timeMs - second.timeMs;
			const meterDelta = Math.round(timeDelta / meterLength);
			meter = second.meter + meterDelta;
		}

		if (index === entriesWithHighlight.length) {
			const $scroller = scrollerRef.current;
			if ($scroller) $scroller.scrollTop = $scroller.scrollHeight;
		}
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
		await loadFromCSVWithoutRender(file);
		render();
	};

	return useMemo(
		() => ({
			entries: entriesWithHighlight,
			scrollerRef,
			addEntry,
			removeEntry,
			saveToCSV,
			loadFromCSV,
			clear: () => {
				loadEntries([]);
				storeEntriesLocally();
				render();
			},
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
	const [rState, render] = useRender();

	useEffect(() => {
		entryWithHighlight.highlighter = setIsHighlighted;
	}, [entryWithHighlight]);

	const setMeter = (meter: number) => {
		console.log("meter");
		entry.meter = meter;
		debouncedStoreEntriesLocally();
		render();
	};

	const setTimeMs = (timeMs: number) => {
		console.log("time");
		entry.timeMs = timeMs;
		debouncedStoreEntriesLocally();
		render();
	};

	const setNote = (note: string) => {
		console.log("note");
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
