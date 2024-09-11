import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { AtomsProvider } from "testUtils";

import type { Entry } from "./entries";
import { platformAtom } from "./atoms";
import { spotifyPlayerAtom } from "./spotify/player";
import type { Player } from "./player";
import { useEntries, ENTRIES_STORAGE_KEY } from "./entries";

const defaultEntry: Entry = { count: 0, timeMs: 0, note: "Start" };

const implantLSEntries = (entries: Entry[]) => {
	beforeEach(() => {
		localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(entries));
	});

	afterEach(() => {
		localStorage.clear();
	});
};

describe("useEntries", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("When there are entries stored in localStorage", () => {
		const storedEntries = [{ count: 1, timeMs: 0, note: "first note" }];

		implantLSEntries(storedEntries);

		it("Loads those entries", () => {
			const { result } = renderHook(() => useEntries());

			expect(result.current.entries).toEqual(storedEntries);
		});
	});

	describe("When there are no entries stored in localStorage", () => {
		it("Loads the default entry", () => {
			const { result } = renderHook(() => useEntries());

			expect(result.current.entries).toEqual([defaultEntry]);
		});
	});

	describe("Adding an entry", () => {
		it("Adds the entry to rendered entries and to localStorage", async () => {
			const { result } = renderHook(() => useEntries());

			await act(() => result.current.addEntry(2));

			const nextEntry: Entry = { count: 0, timeMs: 2, note: "" };
			const expectedEntries = [defaultEntry, nextEntry];

			expect(result.current.entries).toEqual(expectedEntries);

			vi.advanceTimersByTime(2000);

			expect(localStorage.getItem(ENTRIES_STORAGE_KEY)).toEqual(
				JSON.stringify(expectedEntries),
			);
		});

		describe("When prior entries have non-zero counts", () => {
			const priorEntries = [
				{ count: 1, timeMs: 100, note: "first" },
				{ count: 2, timeMs: 200, note: "second" },
			];

			implantLSEntries(priorEntries);

			it("Correctly fills in the count for the new entry", async () => {
				const { result } = renderHook(() => useEntries());

				await act(() => result.current.addEntry(302));

				expect(result.current.entries).toEqual([
					...priorEntries,
					{ count: 3, timeMs: 302, note: "" },
				]);
			});
		});

		describe("With a timestamp between existing entries", () => {
			const existingEntries = [
				{ count: 2, timeMs: 201, note: "" },
				{ count: 4, timeMs: 406, note: "" },
			];

			implantLSEntries(existingEntries);

			it("Places it correctly", async () => {
				const { result } = renderHook(() => useEntries());

				await act(() => result.current.addEntry(299));

				const expectedEntries = [...existingEntries];
				const newExpectedEntry = {
					count: expect.any(Number),
					timeMs: 299,
					note: "",
				};
				expectedEntries.splice(1, 0, newExpectedEntry);
				expect(result.current.entries).toEqual(expectedEntries);
			});
		});

		describe("When new entry has same timestamp as existing entry", () => {
			it("Does not add the entry", async () => {
				const { result } = renderHook(() => useEntries());

				expect(result.current.entries).toEqual([defaultEntry]);

				await act(() => result.current.addEntry(0));

				expect(result.current.entries).toEqual([defaultEntry]);
			});
		});
	});

	describe("Removing an entry", () => {
		it("Removes the rendered entries and in localStorage", async () => {
			const { result } = renderHook(() => useEntries());

			await act(() => result.current.removeEntry(0));

			expect(result.current.entries).toEqual([]);

			vi.advanceTimersByTime(2000);

			expect(localStorage.getItem(ENTRIES_STORAGE_KEY)).toEqual(
				JSON.stringify([]),
			);
		});
	});

	describe("Clearing entries", () => {
		implantLSEntries([{ count: 1, timeMs: 101, note: "one" }]);

		it("Removes all entries and replaces with default in rendered and localStorage", async () => {
			const { result } = renderHook(() => useEntries());
			await act(() => result.current.clear());

			expect(result.current.entries).toEqual([defaultEntry]);

			vi.advanceTimersByTime(2000);

			expect(localStorage.getItem(ENTRIES_STORAGE_KEY)).toEqual(
				JSON.stringify([defaultEntry]),
			);
		});
	});

	describe("When provided a Player", () => {
		const player = {
			addOnTick: vi.fn(),
			removeOnTick: vi.fn(),
		} as unknown as Player;

		const getWrapper =
			(player: Player) =>
			({ children }: React.PropsWithChildren) => (
				<AtomsProvider
					initialValues={[
						[platformAtom, "spotify"],
						[spotifyPlayerAtom, player],
					]}
				>
					{children}
				</AtomsProvider>
			);

		implantLSEntries([
			{ count: 0, timeMs: 0, note: "" },
			{ count: 1, timeMs: 101, note: "" },
			{ count: 3, timeMs: 205, note: "" },
		]);

		it("Highlights, scrolls, and unmounts correctly entry with player ticking", async () => {
			const { result, unmount } = renderHook(() => useEntries(), {
				wrapper: getWrapper(player),
			});

			const highlights = [false, false, false];
			result.current.entries.forEach((_: Entry, index: number) => {
				result.current.setHighlighter(index, (val: boolean) => {
					highlights[index] = val;
				});
			});

			const $scroller = {
				scrollTop: 0,
				clientHeight: 100,
				scrollTo(_newX: number, newTop: number) {
					this.scrollTop = newTop;
				},
			} as HTMLElement;
			result.current.scrollerRef.current = $scroller;

			const entryElHeight = 50;
			result.current.containerRef.current = {
				childNodes: [0, 1, 2].map((i) => ({
					clientHeight: entryElHeight,
					offsetTop: 25 + i * entryElHeight,
				})),
			} as unknown as HTMLElement;

			expect(player.addOnTick).toHaveBeenCalledOnce();
			const tickCallback = (player.addOnTick as Mock).mock.calls[0][0];

			await act(() => tickCallback(0));

			expect(highlights).toEqual([true, false, false]);
			expect($scroller.scrollTop).toEqual(0);

			await act(() => tickCallback(103));

			expect(highlights).toEqual([false, true, false]);
			expect($scroller.scrollTop).toEqual(25);

			await act(() => tickCallback(120));

			expect(highlights).toEqual([false, true, false]);
			expect($scroller.scrollTop).toEqual(25);

			await act(() => tickCallback(400));

			expect(highlights).toEqual([false, false, true]);
			expect($scroller.scrollTop).toEqual(75);

			await act(() => tickCallback(5));

			expect(highlights).toEqual([true, false, false]);
			expect($scroller.scrollTop).toEqual(75);

			await act(() => unmount());

			expect(player.removeOnTick).toHaveBeenCalledOnce();
			expect(player.removeOnTick).toHaveBeenCalledWith(tickCallback);
		});
	});
});
