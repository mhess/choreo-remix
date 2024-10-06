import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";
import type { Atom } from "jotai";

import type { AtomicEntry } from "~/lib/entries";

import Entry from "./Entry";
import classes from "./Entry.module.css";

import { withStore } from "~/test/utils";
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

	const getEntryValues = () => {
		const store = getStore();

		return store.get(atoms.entriesAtom).map((atomicEntry) => {
			const { timeMs, ...rest } = atomicEntry;
			return (Object.getOwnPropertyNames(rest) as (keyof AtomicEntry)[]).reduce(
				(values, atomName) => {
					values[atomName.slice(0, -4)] = store.get(
						atomicEntry[atomName] as Atom<boolean | number>,
					);
					return values;
				},
				{ timeMs } as Record<string, boolean | number>,
			);
		});
	};

	const wrapper = ({ children }: React.PropsWithChildren) => (
		<Wrapper>
			<div role="table">{children}</div>
		</Wrapper>
	);

	it("It displays the correct count, timestamp, and note", () => {
		render(<Entry entry={entry} index={0} />, { wrapper });

		expect(screen.getByLabelText("count")).toHaveValue("5");

		expect(
			screen.getByRole("button", { name: "Seek to 0:12.34" }),
		).toBeInTheDocument();

		expect(screen.getByLabelText("note")).toHaveValue("Note");

		expect(
			screen.queryByRole("button", {
				name: "Fill in the rest of entry counts",
			}),
		).not.toBeInTheDocument();
	});

	it("Is highlighted when current", async () => {
		render(<Entry entry={entry} index={0} />, { wrapper });

		expect(screen.getByRole("row")).not.toHaveClass(classes.highlight);

		await act(() => setAtoms([[entry.isCurrentAtom, true]]));

		expect(screen.getByRole("row")).toHaveClass(classes.highlight);
	});

	it("Correctly modifies the count", async () => {
		render(<Entry entry={entry} index={0} />, { wrapper });

		const countInput = screen.getByLabelText("count");

		await user.clear(countInput);
		await user.type(countInput, "10");

		expect(countInput).toHaveValue("10");
		expect(getEntryValues()).toEqual([
			{
				count: 10,
				countFill: false,
				isCurrent: false,
				note: "Note",
				timeMs: 12340,
			},
		]);
	});

	it("Seeks player to correct time when timestamp is clicked", async () => {
		render(<Entry entry={entry} index={0} />, { wrapper });

		await user.click(screen.getByRole("button", { name: "Seek to 0:12.34" }));

		expect(player.seekTo).toHaveBeenCalledOnce();
		expect(player.seekTo).toHaveBeenCalledWith(12340);
	});

	it("Correctly modifies the note", async () => {
		render(<Entry entry={entry} index={0} />, { wrapper });

		const newValue = "New note";
		const noteInput = screen.getByLabelText("note");
		await user.clear(noteInput);
		await user.type(noteInput, newValue);

		expect(noteInput).toHaveValue(newValue);

		expect(getEntryValues()).toEqual([
			{
				count: 5,
				countFill: false,
				isCurrent: false,
				note: "New note",
				timeMs: 12340,
			},
		]);
	});

	it("Updates entries when the delete button is clicked", async () => {
		setAtoms([
			[
				atoms.entriesAtom,
				[{ timeMs: 0 }, initialEntry, { timeMs: 23450 }, { timeMs: 30000 }],
			],
		]);
		const store = getStore();

		render(<Entry entry={entry} index={1} />, { wrapper });

		expect(getEntryValues()).toEqual([
			{
				count: 0,
				countFill: false,
				isCurrent: false,
				note: "",
				timeMs: 0,
			},
			{
				count: 5,
				countFill: false,
				isCurrent: false,
				note: "Note",
				timeMs: 12340,
			},
			{
				count: 0,
				countFill: false,
				isCurrent: false,
				note: "",
				timeMs: 23450,
			},
			{
				count: 0,
				countFill: false,
				isCurrent: false,
				note: "",
				timeMs: 30000,
			},
		]);

		await user.click(screen.getByRole("button", { name: "Delete Entry" }));

		expect(getEntryValues()).toEqual([
			{
				count: 0,
				countFill: false,
				isCurrent: false,
				note: "",
				timeMs: 0,
			},
			{
				count: 0,
				countFill: false,
				isCurrent: false,
				note: "",
				timeMs: 23450,
			},
			{
				count: 0,
				countFill: false,
				isCurrent: false,
				note: "",
				timeMs: 30000,
			},
		]);
	});

	it("Renders count fill button when the count for current and previous entry are filled", async () => {
		const entryIndex = 1;
		setAtoms([
			[
				atoms.entriesAtom,
				[{ timeMs: 0, count: 1 }, { timeMs: 995, count: 0 }, { timeMs: 2020 }],
			],
		]);
		const entry = getStore().get(atoms.entriesAtom)[entryIndex];

		render(<Entry entry={entry} index={entryIndex} />, { wrapper });

		expect(
			screen.queryByRole("button", {
				name: "Fill in the rest of entry counts",
			}),
		).not.toBeInTheDocument();

		const countInput = screen.getByLabelText("count");

		await user.clear(countInput);
		await user.type(countInput, "2");

		await user.click(
			screen.getByRole("button", { name: "Fill in the rest of entry counts" }),
		);

		const getInDialog = async () =>
			within(await screen.findByRole("dialog", { name: "Fill in the rest?" }));

		await user.click((await getInDialog()).getByRole("button", { name: "No" }));

		expect(getEntryValues()).toEqual([
			{
				count: 1,
				note: "",
				isCurrent: false,
				countFill: false,
				timeMs: 0,
			},
			{
				count: 2,
				note: "",
				isCurrent: false,
				countFill: true,
				timeMs: 995,
			},
			{
				count: 0,
				note: "",
				isCurrent: false,
				countFill: false,
				timeMs: 2020,
			},
		]);

		await user.click(
			screen.getByRole("button", { name: "Fill in the rest of entry counts" }),
		);

		const inDialog = await getInDialog();
		expect(
			inDialog.getByText(
				"Do you want to use the count of this entry and the previous entry to fill in the rest of the counts?",
			),
		).toBeInTheDocument();
		await user.click(inDialog.getByRole("button", { name: "Yes" }));

		expect(
			screen.queryByRole("button", {
				name: "Fill in the rest of entry counts",
			}),
		).not.toBeInTheDocument();

		expect(getEntryValues()).toEqual([
			{
				count: 1,
				note: "",
				countFill: false,
				isCurrent: false,
				timeMs: 0,
			},
			{
				count: 2,
				note: "",
				countFill: false,
				isCurrent: false,
				timeMs: 995,
			},
			{
				count: 3,
				note: "",
				countFill: false,
				isCurrent: false,
				timeMs: 2020,
			},
		]);
	});
});
