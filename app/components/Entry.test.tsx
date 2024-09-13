import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { createTheme, MantineProvider } from "@mantine/core";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";
import { createStore } from "jotai";

import { platformAtom } from "~/lib/atoms";
import { entriesAtom, type EntriesData } from "~/lib/entries";

import Entry from "./Entry";
import classes from "./Entry.module.css";

import { AtomsProvider } from "testUtils";
import {
	_TESTING_ONLY_setSpotifyPlayer,
	type SpotifyPlayer,
} from "~/lib/spotify";

describe("Entry", () => {
	let user: UserEvent;
	let entriesData: EntriesData;
	let player: SpotifyPlayer;
	let store: ReturnType<typeof createStore>;

	beforeEach(() => {
		vi.clearAllMocks();

		store = createStore();

		user = userEvent.setup();

		entriesData = {
			entries: [{ count: 5, timeMs: 123456, note: "Note" }],
			setHighlighter: vi.fn(),
			entryModified: vi.fn(),
			removeEntry: vi.fn(),
		} as unknown as EntriesData;

		player = { seekTo: vi.fn() } as unknown as SpotifyPlayer;

		store.set(_TESTING_ONLY_setSpotifyPlayer, player);
	});

	const wrapper = ({ children }: React.PropsWithChildren) => (
		<AtomsProvider
			store={store}
			initialValues={[
				[platformAtom, "spotify"],
				[entriesAtom, entriesData],
			]}
		>
			<MantineProvider theme={createTheme({})}>
				<div role="table">{children}</div>
			</MantineProvider>
		</AtomsProvider>
	);

	it("It displays the correct count, timestamp, and note", () => {
		render(<Entry index={0} />, { wrapper });

		expect(screen.getByLabelText("count")).toHaveValue(5);

		expect(
			screen.getByRole("button", { name: "Seek to 2:03.45" }),
		).toBeInTheDocument();

		expect(screen.getByLabelText("note")).toHaveValue("Note");
	});

	it("Highlights correctly", async () => {
		render(<Entry index={0} />, { wrapper });

		expect(screen.getByRole("row")).not.toHaveClass(classes.highlight);

		expect(entriesData.setHighlighter).toHaveBeenCalledOnce();
		expect(entriesData.setHighlighter).toHaveBeenCalledWith(
			0,
			expect.any(Function),
		);

		const highlighter = (entriesData.setHighlighter as Mock).mock.calls[0][1];

		await act(() => highlighter(true));

		expect(screen.getByRole("row")).toHaveClass(classes.highlight);

		await act(() => highlighter(false));

		expect(screen.getByRole("row")).not.toHaveClass(classes.highlight);
	});

	describe("When the count gets modified", () => {
		it("Updates both the rendered UI and the entries data", async () => {
			render(<Entry index={0} />, { wrapper });

			const inputLabel = "count";
			await user.clear(screen.getByLabelText(inputLabel));
			await user.type(screen.getByLabelText(inputLabel), "10");

			const expectedValue = 10;
			expect(screen.getByLabelText(inputLabel)).toHaveValue(expectedValue);
			expect(entriesData.entryModified).toHaveBeenCalled();
			expect(entriesData.entries[0][inputLabel]).toEqual(expectedValue);
		});
	});

	describe("When the timestamp is clicked", () => {
		it("Seeks to the correct time on the player", async () => {
			render(<Entry index={0} />, { wrapper });

			await user.click(screen.getByRole("button", { name: "Seek to 2:03.45" }));

			expect(player.seekTo).toHaveBeenCalledOnce();
			expect(player.seekTo).toHaveBeenCalledWith(123456);
		});
	});

	describe("When the note gets modified", () => {
		it("Updates both the rendered UI and the entries data", async () => {
			render(<Entry index={0} />, { wrapper });

			const inputLabel = "note";
			const expectedValue = "New note";
			await user.clear(screen.getByLabelText(inputLabel));
			await user.type(screen.getByLabelText(inputLabel), expectedValue);

			expect(screen.getByLabelText(inputLabel)).toHaveValue(expectedValue);
			expect(entriesData.entryModified).toHaveBeenCalled();
			expect(entriesData.entries[0][inputLabel]).toEqual(expectedValue);
		});
	});

	describe("When delete button is clicked", () => {
		it(`Calls the "removeEntry" entries function`, async () => {
			render(<Entry index={0} />, { wrapper });

			await user.click(screen.getByRole("button", { name: "Delete Entry" }));

			expect(entriesData.removeEntry).toHaveBeenCalledOnce();
			expect(entriesData.removeEntry).toHaveBeenCalledWith(0);
		});
	});
});
