import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";

import type { AtomicEntry } from "~/lib/entries";

import Entry from "./Entry";
import classes from "./Entry.module.css";

import { withStore } from "testUtils";
import type { PlatformPlayer } from "~/lib/player";

describe("Entry", () => {
	let user: UserEvent;
	let player: PlatformPlayer;
	let entry: AtomicEntry;

	const { wrapper: Wrapper, getAtoms, setAtoms, getStore } = withStore();

	let atoms: ReturnType<typeof getAtoms>;

	const initialEntry = {
		timeMs: 12340,
		count: 5,
		note: "Note",
		isCurrent: false,
	};

	beforeEach(() => {
		vi.clearAllMocks();

		user = userEvent.setup();

		player = { seekTo: vi.fn() } as unknown as PlatformPlayer;

		atoms = getAtoms("spotify");

		setAtoms([
			[atoms.playerAtom, player],
			[atoms.entriesAtom, [initialEntry]],
		]);

		entry = getStore().get(atoms.entriesAtom)[0];
	});

	const wrapper = ({ children }: React.PropsWithChildren) => (
		<Wrapper>
			<div role="table">{children}</div>
		</Wrapper>
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

		await act(() => setAtoms([[entry.isCurrentAtom, true]]));

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
		setAtoms([[atoms.entriesAtom, [initialEntry, { timeMs: 23450 }]]]);
		const store = getStore();

		render(<Entry entry={entry} />, { wrapper });

		expect(store.get(atoms.entriesAtom).map((e) => e.timeMs)).toEqual([
			12340, 23450,
		]);

		await user.click(screen.getByRole("button", { name: "Delete Entry" }));

		expect(store.get(atoms.entriesAtom).map((e) => e.timeMs)).toEqual([23450]);
	});
});
