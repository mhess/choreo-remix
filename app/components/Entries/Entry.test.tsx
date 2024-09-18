import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { createTheme, MantineProvider } from "@mantine/core";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";
import { atom, createStore } from "jotai";

import { _TEST_ONLY_atomsByPlatfom, platformAtom } from "~/lib/atoms";
import { entryAtomsAtom, type AtomicEntry } from "~/lib/entries";

import Entry from "./Entry";
import classes from "./Entry.module.css";

import { AtomsProvider } from "testUtils";
import type { PlatformPlayer } from "~/lib/player";

const platform = "spotify";
const { player: playerAtom } = _TEST_ONLY_atomsByPlatfom()[platform];

describe("Entry", () => {
	let user: UserEvent;
	let player: PlatformPlayer;
	let store: ReturnType<typeof createStore>;
	let entry: AtomicEntry;

	beforeEach(() => {
		vi.clearAllMocks();

		user = userEvent.setup();

		player = { seekTo: vi.fn() } as unknown as PlatformPlayer;

		store = createStore();
		store.set(platformAtom, platform);
		store.set(playerAtom, player);

		const { entriesAtom } = store.get(entryAtomsAtom);
		store.set(entriesAtom, [
			{ timeMs: 12340, count: 5, note: "Note", isCurrent: false },
		]);

		entry = store.get(entriesAtom)[0];
	});

	const wrapper = ({ children }: React.PropsWithChildren) => (
		<AtomsProvider store={store}>
			<MantineProvider theme={createTheme({})}>
				<div role="table">{children}</div>
			</MantineProvider>
		</AtomsProvider>
	);

	it("It displays the correct count, timestamp, and note", () => {
		render(<Entry entry={entry} />, { wrapper });

		expect(screen.getByLabelText("count")).toHaveValue("5");

		expect(
			screen.getByRole("button", { name: "Seek to 0:12.34" }),
		).toBeInTheDocument();

		expect(screen.getByLabelText("note")).toHaveValue("Note");
	});

	it("Is highlighted when current", async () => {
		render(<Entry entry={entry} />, { wrapper });

		expect(screen.getByRole("row")).not.toHaveClass(classes.highlight);

		await act(() => store.set(entry.isCurrentAtom, true));

		expect(screen.getByRole("row")).toHaveClass(classes.highlight);
	});

	it("Shows the new count when the count is modified", async () => {
		render(<Entry entry={entry} />, { wrapper });

		const countInput = screen.getByLabelText("count");

		await user.clear(countInput);
		await user.type(countInput, "10");

		expect(countInput).toHaveValue("10");
	});

	it("Seeks player to correct time when timestamp is clicked", async () => {
		render(<Entry entry={entry} />, { wrapper });

		await user.click(screen.getByRole("button", { name: "Seek to 0:12.34" }));

		expect(player.seekTo).toHaveBeenCalledOnce();
		expect(player.seekTo).toHaveBeenCalledWith(12340);
	});

	it("Shows the new note when the note is modified", async () => {
		render(<Entry entry={entry} />, { wrapper });

		const newValue = "New note";
		const noteInput = screen.getByLabelText("note");
		await user.clear(noteInput);
		await user.type(noteInput, newValue);

		expect(noteInput).toHaveValue(newValue);
	});

	it("When the delete button is clicked it writes to the correct atom", async () => {
		const { entriesAtom } = store.get(entryAtomsAtom);

		const secondEntry: AtomicEntry = {
			countAtom: atom(0),
			timeMs: 23450,
			noteAtom: atom(""),
			isCurrentAtom: atom(false),
		};

		// Need two entries since no entries is not allowed
		store.set(entriesAtom, [entry, secondEntry]);

		render(<Entry entry={entry} />, { wrapper });

		expect(store.get(entriesAtom).map((e) => e.timeMs)).toEqual([12340, 23450]);

		await user.click(screen.getByRole("button", { name: "Delete Entry" }));

		expect(store.get(entriesAtom).map((e) => e.timeMs)).toEqual([23450]);
	});
});
