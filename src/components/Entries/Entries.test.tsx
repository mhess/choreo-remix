import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	act,
	render,
	screen,
	waitFor,
	waitForElementToBeRemoved,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";
import type { Mock } from "vitest";
import { useAtom } from "jotai";

import type { AtomicEntry, EntryInput } from "~/lib/entries";
import type { PlatformPlayer } from "~/lib/player";
import { withStore } from "~/test/utils";

import Entries from "./Entries";
import Help from "./Help";

vi.mock("./Entry", () => ({
	default: ({ entry, index }: { entry: AtomicEntry; index: number }) => {
		const { timeMs, isCurrentAtom, countAtom } = entry;
		const [[isCurrent], [count]] = [isCurrentAtom, countAtom].map((a) =>
			useAtom(a),
		);
		return (
			<div data-testid="entry">
				{JSON.stringify({ timeMs, isCurrent, count, index })}
			</div>
		);
	},
}));

vi.mock("./Help", () => ({
	default: ({ entry }: { entry: AtomicEntry }) => <div data-testid="help" />,
}));

describe("Entries", () => {
	const platform = "spotify";
	let user: UserEvent;
	let player: PlatformPlayer;

	const { wrapper, getAtoms, setAtoms } = withStore();

	beforeEach(() => {
		vi.clearAllMocks();

		user = userEvent.setup();
		player = {
			play: vi.fn(),
			pause: vi.fn(),
			getCurrentTime: vi.fn(async () => 0),
			seekTo: vi.fn(),
			addOnTick: vi.fn(),
			removeOnTick: vi.fn(),
		} as unknown as PlatformPlayer;

		const { playerAtom } = getAtoms(platform);
		setAtoms([[playerAtom, player]]);
	});

	const getRenderedEntryValues = () =>
		screen
			.getAllByTestId("entry")
			.map((e) => JSON.parse(e.textContent as string));

	const tickToTime = (timeMs: number) =>
		act(async () => {
			(player.getCurrentTime as Mock).mockReturnValue(Promise.resolve(timeMs));
			for (const call of (player.addOnTick as Mock).mock.calls)
				await call[0](timeMs);
		});

	const arrange = (entryInputs = [] as EntryInput[]) => {
		const { entriesAtom } = getAtoms(platform);
		setAtoms([[entriesAtom, entryInputs]]);

		return render(<Entries />, { wrapper });
	};

	it("Renders the initial entry with column headers", () => {
		render(<Entries />, { wrapper });

		const headerRow = screen.getByRole("row");

		const headers = within(headerRow).getAllByRole("columnheader");

		["count", "timestamp", "note"].forEach((title, index) =>
			expect(headers[index]).toHaveTextContent(title),
		);

		expect(getRenderedEntryValues()).toEqual([
			{
				timeMs: 0,
				count: 0,
				isCurrent: true,
				index: 0,
			},
		]);
	});

	it("Renders the controls which control playback", async () => {
		const { pausedAtom } = getAtoms(platform);
		arrange();

		const controlsRegion = screen.getByRole("toolbar", { name: "Controls" });

		const inControls = within(controlsRegion);

		expect(
			inControls.queryByRole("button", { name: "Paused" }),
		).not.toBeInTheDocument();

		expect(player.play).not.toHaveBeenCalled();

		await user.click(inControls.getByRole("button", { name: "Play" }));

		expect(player.play).toHaveBeenCalledOnce();

		await act(() => setAtoms([[pausedAtom, false]]));

		expect(
			inControls.getByRole("button", { name: "Pause" }),
		).toBeInTheDocument();

		expect(
			inControls.queryByRole("button", { name: "Play" }),
		).not.toBeInTheDocument();

		expect(player.seekTo).not.toHaveBeenCalled();
		(player.getCurrentTime as Mock).mockReturnValue(Promise.resolve(12345));

		await user.click(
			inControls.getByRole("button", { name: "Fast-forward 5 sec" }),
		);

		expect(player.seekTo).toHaveBeenCalledOnce();
		expect(player.seekTo).toHaveBeenCalledWith(17345);

		expect(player.seekTo).toHaveBeenCalledOnce();

		await user.click(inControls.getByRole("button", { name: "Rewind 5 sec" }));

		expect(player.seekTo).toHaveBeenCalledTimes(2);
		expect(player.seekTo).toHaveBeenLastCalledWith(7345);
	});

	it("Highlights the current entry and updates the time display as the player is ticking", async () => {
		arrange([{ timeMs: 0 }, { timeMs: 1000 }, { timeMs: 2000 }]);

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

		await tickToTime(500);

		expect(getHighlights()).toEqual([true, false, false]);
		expect(getTimeDisplay()).toHaveTextContent("0:00.50");

		await tickToTime(1000);

		expect(getHighlights()).toEqual([false, true, false]);
		expect(getTimeDisplay()).toHaveTextContent("0:01.00");

		await tickToTime(1500);

		expect(getHighlights()).toEqual([false, true, false]);
		expect(getTimeDisplay()).toHaveTextContent("0:01.50");

		await tickToTime(2000);

		expect(getHighlights()).toEqual([false, false, true]);
		expect(getTimeDisplay()).toHaveTextContent("0:02.00");

		await tickToTime(3500);

		expect(getHighlights()).toEqual([false, false, true]);
		expect(getTimeDisplay()).toHaveTextContent("0:03.50");
	});

	it("Adds a new entry correctly", async () => {
		const initialEntries = [{ timeMs: 0 }, { timeMs: 1000 }, { timeMs: 2000 }];
		arrange(initialEntries);

		await tickToTime(0);

		await user.click(screen.getByRole("button", { name: "Add Entry" }));

		expect(getRenderedEntryValues()).toEqual([
			{
				count: 0,
				isCurrent: true,
				timeMs: 0,
				index: 0,
			},
			{
				count: 0,
				isCurrent: false,
				timeMs: 1000,
				index: 1,
			},
			{
				count: 0,
				isCurrent: false,
				timeMs: 2000,
				index: 2,
			},
		]);

		await tickToTime(500);

		await user.click(screen.getByRole("button", { name: "Add Entry" }));

		expect(getRenderedEntryValues()).toEqual([
			{
				count: 0,
				isCurrent: false,
				timeMs: 0,
				index: 0,
			},
			{
				count: 0,
				isCurrent: true,
				timeMs: 500,
				index: 1,
			},
			{
				count: 0,
				isCurrent: false,
				timeMs: 1000,
				index: 2,
			},
			{
				count: 0,
				isCurrent: false,
				timeMs: 2000,
				index: 3,
			},
		]);

		const { entriesAtom } = getAtoms(platform);
		setAtoms([[entriesAtom, initialEntries]]);

		await tickToTime(1000);

		await user.click(screen.getByRole("button", { name: "Add Entry" }));

		expect(getRenderedEntryValues()).toEqual([
			{
				count: 0,
				isCurrent: false,
				timeMs: 0,
				index: 0,
			},
			{
				count: 0,
				isCurrent: true,
				timeMs: 1000,
				index: 1,
			},
			{
				count: 0,
				isCurrent: false,
				timeMs: 2000,
				index: 2,
			},
		]);

		setAtoms([[entriesAtom, initialEntries]]);

		await tickToTime(1500);

		await user.click(screen.getByRole("button", { name: "Add Entry" }));

		expect(getRenderedEntryValues()).toEqual([
			{
				count: 0,
				isCurrent: false,
				timeMs: 0,
				index: 0,
			},
			{
				count: 0,
				isCurrent: false,
				timeMs: 1000,
				index: 1,
			},
			{
				count: 0,
				isCurrent: true,
				timeMs: 1500,
				index: 2,
			},
			{
				count: 0,
				isCurrent: false,
				timeMs: 2000,
				index: 3,
			},
		]);

		setAtoms([[entriesAtom, initialEntries]]);

		await tickToTime(3000);

		await user.click(screen.getByRole("button", { name: "Add Entry" }));

		expect(getRenderedEntryValues()).toEqual([
			{
				count: 0,
				isCurrent: false,
				timeMs: 0,
				index: 0,
			},
			{
				count: 0,
				isCurrent: false,
				timeMs: 1000,
				index: 1,
			},
			{
				count: 0,
				isCurrent: false,
				timeMs: 2000,
				index: 2,
			},
			{
				count: 0,
				isCurrent: true,
				timeMs: 3000,
				index: 3,
			},
		]);
	});

	it("Fills in new count if previous two entries have counts", async () => {
		const { entriesAtom } = getAtoms(platform);
		setAtoms([[entriesAtom, [{ timeMs: 0 }, { timeMs: 1000, count: 4 }]]]);

		(player.getCurrentTime as Mock).mockReturnValue(Promise.resolve(1492));

		render(<Entries />, { wrapper });

		await user.click(screen.getByRole("button", { name: "Add Entry" }));

		expect(getRenderedEntryValues()).toEqual([
			{
				count: 0,
				isCurrent: false,
				timeMs: 0,
				index: 0,
			},
			{
				count: 4,
				isCurrent: false,
				timeMs: 1000,
				index: 1,
			},
			{
				count: 6,
				isCurrent: true,
				timeMs: 1492,
				index: 2,
			},
		]);
	});

	it(`Renders/hides help content when the "Help" button is clicked`, async () => {
		localStorage.clear();

		const { unmount } = render(<Entries />, { wrapper });

		expect(screen.queryByTestId("help")).not.toBeInTheDocument();

		// Using this less efficient query bc it's the same used to assert element
		// not rendered.
		const findTooltip = () =>
			waitFor(() => screen.getByRole("tooltip", { name: /^First time/ }), {
				interval: 10,
				timeout: 30,
			});

		await findTooltip();

		await user.click(screen.getByRole("button", { name: "Show Help" }));

		await waitForElementToBeRemoved(() =>
			screen.queryByRole("tooltip", { name: /^First time/ }),
		);

		expect(screen.getByTestId("help")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Hide Help" }));

		expect(screen.queryByTestId("help")).not.toBeInTheDocument();

		unmount();

		render(<Entries />, { wrapper });

		await expect(findTooltip).rejects.toThrow(
			'Unable to find role="tooltip" and name `/^First time/`',
		);
	});
});
