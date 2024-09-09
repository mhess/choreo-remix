import type { ContextType } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { createTheme, MantineProvider } from "@mantine/core";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";

import { PlayerContext } from "~/lib/spotify/player";
import type { WrappedPlayer } from "~/lib/spotify/player";

import { EntriesContext } from "~/lib/entries";

import Entry from "./Entry";
import classes from "./Entry.module.css";

type UseEntriesOutput = ContextType<typeof EntriesContext>;

const getWrapper =
	(player: WrappedPlayer, entries: UseEntriesOutput) =>
	({ children }: React.PropsWithChildren) => (
		<MantineProvider theme={createTheme({})}>
			<PlayerContext.Provider value={player}>
				<EntriesContext.Provider value={entries}>
					<div role="table">{children}</div>
				</EntriesContext.Provider>
			</PlayerContext.Provider>
		</MantineProvider>
	);

describe("Entry", () => {
	let user: UserEvent;
	let useEntriesOutput: UseEntriesOutput;
	let player: WrappedPlayer;

	beforeEach(() => {
		vi.clearAllMocks();

		user = userEvent.setup();

		useEntriesOutput = {
			entries: [{ count: 5, timeMs: 123456, note: "Note" }],
			setHighlighter: vi.fn(),
			entryModified: vi.fn(),
			removeEntry: vi.fn(),
		} as unknown as UseEntriesOutput;

		player = { seekTo: vi.fn() } as unknown as WrappedPlayer;
	});

	it("It displays the correct count, timestamp, and note", () => {
		render(<Entry index={0} />, {
			wrapper: getWrapper(player, useEntriesOutput),
		});

		expect(screen.getByLabelText("count")).toHaveValue(5);

		expect(
			screen.getByRole("button", { name: "Seek to 2:03.45" }),
		).toBeInTheDocument();

		expect(screen.getByLabelText("note")).toHaveValue("Note");
	});

	describe("When it's registered highlighter gets called", () => {
		it("Highlights correctly", async () => {
			render(<Entry index={0} />, {
				wrapper: getWrapper(player, useEntriesOutput),
			});

			expect(screen.getByRole("row")).not.toHaveClass(classes.highlight);

			expect(useEntriesOutput.setHighlighter).toHaveBeenCalledOnce();
			expect(useEntriesOutput.setHighlighter).toHaveBeenCalledWith(
				0,
				expect.any(Function),
			);

			const highlighter = (useEntriesOutput.setHighlighter as Mock).mock
				.calls[0][1];

			await act(() => highlighter(true));

			expect(screen.getByRole("row")).toHaveClass(classes.highlight);

			await act(() => highlighter(false));

			expect(screen.getByRole("row")).not.toHaveClass(classes.highlight);
		});
	});

	describe("When the count gets modified", () => {
		it("Updates both the rendered UI and the entries data", async () => {
			render(<Entry index={0} />, {
				wrapper: getWrapper(player, useEntriesOutput),
			});

			const inputLabel = "count";
			await user.clear(screen.getByLabelText(inputLabel));
			await user.type(screen.getByLabelText(inputLabel), "10");

			const expectedValue = 10;
			expect(screen.getByLabelText(inputLabel)).toHaveValue(expectedValue);
			expect(useEntriesOutput.entryModified).toHaveBeenCalled();
			expect(useEntriesOutput.entries[0][inputLabel]).toEqual(expectedValue);
		});
	});

	describe("When the timestamp is clicked", () => {
		it("Seeks to the correct time on the player", async () => {
			render(<Entry index={0} />, {
				wrapper: getWrapper(player, useEntriesOutput),
			});

			await user.click(screen.getByRole("button", { name: "Seek to 2:03.45" }));

			expect(player.seekTo).toHaveBeenCalledOnce();
			expect(player.seekTo).toHaveBeenCalledWith(123456);
		});
	});

	describe("When the note gets modified", () => {
		it("Updates both the rendered UI and the entries data", async () => {
			render(<Entry index={0} />, {
				wrapper: getWrapper(player, useEntriesOutput),
			});

			const inputLabel = "note";
			const expectedValue = "New note";
			await user.clear(screen.getByLabelText(inputLabel));
			await user.type(screen.getByLabelText(inputLabel), expectedValue);

			expect(screen.getByLabelText(inputLabel)).toHaveValue(expectedValue);
			expect(useEntriesOutput.entryModified).toHaveBeenCalled();
			expect(useEntriesOutput.entries[0][inputLabel]).toEqual(expectedValue);
		});
	});

	describe("When delete button is clicked", () => {
		it(`Calls the "removeEntry" entries function`, async () => {
			render(<Entry index={0} />, {
				wrapper: getWrapper(player, useEntriesOutput),
			});

			await user.click(screen.getByRole("button", { name: "Delete Entry" }));

			expect(useEntriesOutput.removeEntry).toHaveBeenCalledOnce();
			expect(useEntriesOutput.removeEntry).toHaveBeenCalledWith(0);
		});
	});
});
