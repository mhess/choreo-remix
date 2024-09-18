import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import { createTheme, MantineProvider } from "@mantine/core";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";
import type { Mock } from "vitest";
import { createStore, useAtom, type WritableAtom } from "jotai";

import { platformAtom, _TEST_ONLY_atomsByPlatfom } from "~/lib/atoms";
import {
	entryAtomsAtom,
	type EntryInput,
	type AtomicEntry,
} from "~/lib/entries";
import type { PlatformPlayer } from "~/lib/player";
import { AtomsProvider } from "testUtils";

import Entries from "./index";

const platform = "spotify";
const platformAtoms = _TEST_ONLY_atomsByPlatfom()[platform];

vi.mock("./Entry", () => ({
	default: ({ entry }: { entry: AtomicEntry }) => {
		const { timeMs, isCurrentAtom, countAtom } = entry;
		const [[isCurrent], [count]] = [isCurrentAtom, countAtom].map((a) =>
			useAtom(a),
		);
		return (
			<div data-testid="entry">
				{JSON.stringify({ timeMs, isCurrent, count })}
			</div>
		);
	},
}));

describe("Entries", () => {
	let user: UserEvent;
	let player: PlatformPlayer;
	let store: ReturnType<typeof createStore>;
	let entriesAtom: WritableAtom<AtomicEntry[], [EntryInput[]], void>;

	beforeEach(() => {
		vi.clearAllMocks();

		store = createStore();
		user = userEvent.setup();
		player = {
			play: vi.fn(),
			pause: vi.fn(),
			getCurrentTime: vi.fn(async () => 0),
			seekTo: vi.fn(),
			addOnTick: vi.fn(),
			removeOnTick: vi.fn(),
		} as unknown as PlatformPlayer;

		store.set(platformAtom, platform);
		store.set(platformAtoms.player, player);
		entriesAtom = store.get(entryAtomsAtom).entriesAtom;
	});

	const wrapper = ({ children }: React.PropsWithChildren) => (
		<AtomsProvider store={store}>
			<MantineProvider theme={createTheme({})}>{children}</MantineProvider>
		</AtomsProvider>
	);

	const getEntryValues = () =>
		screen
			.getAllByTestId("entry")
			.map((e) => JSON.parse(e.textContent as string));

	const tickToTime = (timeMs: number) =>
		act(async () => {
			for (const call of (player.addOnTick as Mock).mock.calls)
				await call[0](timeMs);
		});

	it("Renders the initial entriy with column headers", () => {
		render(<Entries />, { wrapper });

		const headerRow = screen.getByRole("row");

		const headers = within(headerRow).getAllByRole("columnheader");

		["count", "timestamp", "note"].forEach((title, index) =>
			expect(headers[index]).toHaveTextContent(title),
		);

		expect(getEntryValues()).toEqual([
			{
				timeMs: 0,
				count: 0,
				isCurrent: true,
			},
		]);
	});

	it("Renders the controls which control playback", async () => {
		render(<Entries />, { wrapper });

		const controlsRegion = screen.getByRole("toolbar", { name: "Controls" });

		const inControls = within(controlsRegion);

		expect(
			inControls.queryByRole("button", { name: "Paused" }),
		).not.toBeInTheDocument();

		expect(player.play).not.toHaveBeenCalled();

		await user.click(inControls.getByRole("button", { name: "Play" }));

		expect(player.play).toHaveBeenCalledOnce();

		await act(() => store.set(platformAtoms.paused, false));

		expect(
			inControls.getByRole("button", { name: "Pause" }),
		).toBeInTheDocument();

		expect(
			inControls.queryByRole("button", { name: "Play" }),
		).not.toBeInTheDocument();

		expect(player.seekTo).not.toHaveBeenCalled();

		await user.click(
			inControls.getByRole("button", { name: "Fast-forward 5 sec" }),
		);

		expect(player.seekTo).toHaveBeenCalledOnce();
		expect(player.seekTo).toHaveBeenCalledWith(5000);

		expect(player.seekTo).toHaveBeenCalledOnce();

		await user.click(inControls.getByRole("button", { name: "Rewind 5 sec" }));

		expect(player.seekTo).toHaveBeenCalledTimes(2);
		expect(player.seekTo).toHaveBeenLastCalledWith(-5000);
	});

	it("Highlights the current entry and updates the time display as the player is ticking", async () => {
		store.set(entriesAtom, [{ timeMs: 0 }, { timeMs: 1000 }, { timeMs: 2000 }]);
		render(<Entries />, { wrapper });

		const getHighlights = () =>
			screen
				.getAllByTestId("entry")
				.map((e) => JSON.parse(e.textContent as string).isCurrent);

		const getTimeDisplay = () =>
			within(screen.getByRole("toolbar", { name: "Controls" })).getByText(
				/\d:\d\d.\d\d/,
			);

		await tickToTime(0);

		expect(getHighlights()).toEqual([true, false, false]);
		expect(getTimeDisplay()).toHaveTextContent("0:00.00");

		await tickToTime(1500);

		expect(getHighlights()).toEqual([false, true, false]);
		expect(getTimeDisplay()).toHaveTextContent("0:01.50");

		await tickToTime(3500);

		expect(getHighlights()).toEqual([false, false, true]);
		expect(getTimeDisplay()).toHaveTextContent("0:03.50");
	});

	it("Adds a new entry correctly", async () => {
		render(<Entries />, { wrapper });

		(player.getCurrentTime as Mock).mockReturnValue(Promise.resolve(1234));

		await user.click(screen.getByRole("button", { name: "Add Entry" }));

		expect(getEntryValues()).toEqual([
			{
				count: 0,
				isCurrent: false,
				timeMs: 0,
			},
			{
				count: 0,
				isCurrent: true,
				timeMs: 1234,
			},
		]);
	});

	it("Fills in new count if previous two entries have counts", async () => {
		store.set(entriesAtom, [{ timeMs: 0 }, { timeMs: 1000, count: 4 }]);

		(player.getCurrentTime as Mock).mockReturnValue(Promise.resolve(1492));

		render(<Entries />, { wrapper });

		await user.click(screen.getByRole("button", { name: "Add Entry" }));

		expect(getEntryValues()).toEqual([
			{
				count: 0,
				isCurrent: false,
				timeMs: 0,
			},
			{
				count: 4,
				isCurrent: false,
				timeMs: 1000,
			},
			{
				count: 6,
				isCurrent: true,
				timeMs: 1492,
			},
		]);
	});
});
