import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";
import type { Atom } from "jotai";

import type { AtomicEntry, EntryInput } from "~/lib/entries";
import type { Platform } from "~/lib/platformAtoms";
import { withStore } from "~/test/utils";
import type { PlatformPlayer } from "~/lib/player";

import Entry from "./Entry";
import classes from "./Entry.module.css";

describe("Entry", () => {
	const platform: Platform = "spotify";
	let user: UserEvent;

	const {
		wrapper: Wrapper,
		getAtoms,
		setAtoms,
		getStore,
		setPlatform,
	} = withStore();

	let atoms: ReturnType<typeof getAtoms>;

	const exampleEntry = {
		timeMs: 12340,
		count: 5,
		note: "Note",
		isCurrent: false,
	};

	beforeEach(() => {
		vi.clearAllMocks();

		user = userEvent.setup();

		setPlatform(platform);
	});

	const getEntryValues = () => {
		const { entriesAtom } = getAtoms(platform);
		const store = getStore();

		return store.get(entriesAtom).map((atomicEntry) => {
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

	const arrange = (entryInputs: EntryInput[], index: number) => {
		const { entriesAtom } = getAtoms(platform);
		setAtoms([[entriesAtom, entryInputs]]);
		const entry = getStore().get(entriesAtom)[index];

		const result = render(<Entry entry={entry} index={index} />, { wrapper });

		return { entry, result };
	};

	it("It displays the correct count, timestamp, and note", () => {
		arrange([exampleEntry], 0);

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
		const { entry } = arrange([exampleEntry], 0);

		expect(screen.getByRole("row")).not.toHaveClass(classes.highlight);

		await act(() => setAtoms([[entry.isCurrentAtom, true]]));

		expect(screen.getByRole("row")).toHaveClass(classes.highlight);
	});

	it("Correctly modifies the count", async () => {
		arrange([exampleEntry], 0);

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
		const player = { seekTo: vi.fn() } as unknown as PlatformPlayer;
		const { playerAtom } = getAtoms("spotify");
		setAtoms([[playerAtom, player]]);

		arrange([exampleEntry], 0);

		await user.click(screen.getByRole("button", { name: "Seek to 0:12.34" }));

		expect(player.seekTo).toHaveBeenCalledOnce();
		expect(player.seekTo).toHaveBeenCalledWith(12340);
	});

	it("Correctly modifies the note", async () => {
		arrange([exampleEntry], 0);

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

	it("Updates entries when the remove button is clicked", async () => {
		arrange(
			[{ timeMs: 0 }, exampleEntry, { timeMs: 23450 }, { timeMs: 30000 }],
			1,
		);

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

	it("Replaces entry with initial entry when removing only entry", async () => {
		arrange([exampleEntry], 0);

		await user.click(screen.getByRole("button", { name: "Delete Entry" }));

		expect(getEntryValues()).toEqual([
			{
				count: 0,
				countFill: false,
				isCurrent: true,
				note: "Start",
				timeMs: 0,
			},
		]);
	});

	it("Renders count fill button when the count for current and previous entry are filled", async () => {
		arrange(
			[{ timeMs: 0, count: 1 }, { timeMs: 995, count: 0 }, { timeMs: 2020 }],
			1,
		);

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
