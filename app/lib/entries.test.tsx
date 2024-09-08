import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook } from "@testing-library/react";

import { PlayerContext } from "./spotify";
import type { OnTickCallback, WrappedPlayer } from "./spotify";

import { EntriesContext, useEntries, useEntry } from "./entries";
import type { Entry } from "./entries";

// FIXME: import this from entries.ts
const STORAGE_KEY = "choreo-entries";

const defaultEntry: Entry = { count: 0, timeMs: 0, note: "Start" };

const implantLSEntries = (entries: Entry[]) => {
	beforeEach(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
	});

	afterEach(() => {
		localStorage.clear();
	});
};

describe("useEntries", () => {
	beforeEach(async () => {
		vi.useFakeTimers();

		// FIXME: Remove this when module-level state is removed
		const { result } = renderHook(() => useEntries(undefined));
		await act(() => result.current.clear());
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("When there are entries stored in localStorage", () => {
		const storedEntries = [{ count: 1, timeMs: 0, note: "first note" }];

		implantLSEntries(storedEntries);

		it("Loads those entries", () => {
			const { result } = renderHook(() => useEntries(undefined));

			expect(result.current.entries).toEqual(storedEntries);
		});
	});

	describe("When there are no entries stored in localStorage", () => {
		it("Loads the default entry", () => {
			const { result } = renderHook(() => useEntries(undefined));

			expect(result.current.entries).toEqual([defaultEntry]);
		});
	});

	describe("Adding an entry", () => {
		it("Adds the entry to rendered entries and to localStorage", async () => {
			const { result } = renderHook(() => useEntries(undefined));

			await act(() => result.current.addEntry(2));

			const nextEntry: Entry = { count: 0, timeMs: 2, note: "" };
			const expectedEntries = [defaultEntry, nextEntry];

			expect(result.current.entries).toEqual(expectedEntries);

			vi.advanceTimersByTime(2000);

			expect(localStorage.getItem(STORAGE_KEY)).toEqual(
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
				const { result } = renderHook(() => useEntries(undefined));

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
				const { result } = renderHook(() => useEntries(undefined));

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
				const { result } = renderHook(() => useEntries(undefined));

				expect(result.current.entries).toEqual([defaultEntry]);

				await act(() => result.current.addEntry(0));

				expect(result.current.entries).toEqual([defaultEntry]);
			});
		});
	});

	describe("Removing an entry", () => {
		it("Removes the rendered entries and in localStorage", async () => {
			const { result } = renderHook(() => useEntries(undefined));

			await act(() => result.current.removeEntry(0));

			expect(result.current.entries).toEqual([]);

			vi.advanceTimersByTime(2000);

			expect(localStorage.getItem(STORAGE_KEY)).toEqual(JSON.stringify([]));
		});
	});

	describe("Clearing entries", () => {
		implantLSEntries([{ count: 1, timeMs: 101, note: "one" }]);

		it("Removes all entries and replaces with default in rendered and localStorage", async () => {
			const { result } = renderHook(() => useEntries(undefined));
			await act(() => result.current.clear());

			expect(result.current.entries).toEqual([defaultEntry]);

			vi.advanceTimersByTime(2000);

			expect(localStorage.getItem(STORAGE_KEY)).toEqual(
				JSON.stringify([defaultEntry]),
			);
		});
	});

	describe("When provided a WrappedPlayer", () => {
		const callbacks: OnTickCallback[] = [];
		const player = {
			addOnTick: (cb: OnTickCallback) => callbacks.push(cb),
			removeOnTick: (cb: OnTickCallback) => {
				const remaining = callbacks.filter((c) => c !== cb);
				callbacks.splice(0, callbacks.length, ...remaining);
			},
		} as unknown as WrappedPlayer;

		const Entries = () => {
			const entries = useEntries(player);
			return (
				<PlayerContext.Provider value={player}>
					<EntriesContext.Provider value={entries}>
						{entries.entries.map(({ timeMs }, index) => (
							<FakeEntry key={timeMs} index={index} />
						))}
					</EntriesContext.Provider>
				</PlayerContext.Provider>
			);
		};

		const FakeEntry = ({ index }: { index: number }) => {
			const { isHighlighted } = useEntry(index);

			return <div>{`${index}: ${isHighlighted ? "highlighted" : "not"}`}</div>;
		};

		implantLSEntries([
			{ count: 0, timeMs: 0, note: "" },
			{ count: 1, timeMs: 101, note: "" },
			{ count: 3, timeMs: 205, note: "" },
		]);

		const tickWith = (timeMs: number) => {
			for (const cb of callbacks) cb(timeMs);
		};

		// TODO add checking for scrolling
		it("Highlights correct entry while player is ticking", async () => {
			const { getByText } = render(<Entries />);

			await act(() => tickWith(0));

			expect(getByText("0: highlighted")).toBeInTheDocument();
			expect(getByText("1: not")).toBeInTheDocument();
			expect(getByText("2: not")).toBeInTheDocument();

			await act(() => tickWith(103));

			expect(getByText("0: not")).toBeInTheDocument();
			expect(getByText("1: highlighted")).toBeInTheDocument();
			expect(getByText("2: not")).toBeInTheDocument();

			await act(() => tickWith(120));

			expect(getByText("0: not")).toBeInTheDocument();
			expect(getByText("1: highlighted")).toBeInTheDocument();
			expect(getByText("2: not")).toBeInTheDocument();

			await act(() => tickWith(400));

			expect(getByText("0: not")).toBeInTheDocument();
			expect(getByText("1: not")).toBeInTheDocument();
			expect(getByText("2: highlighted")).toBeInTheDocument();

			await act(() => tickWith(5));

			expect(getByText("0: highlighted")).toBeInTheDocument();
			expect(getByText("1: not")).toBeInTheDocument();
			expect(getByText("2: not")).toBeInTheDocument();
		});
	});
});
