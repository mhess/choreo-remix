import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore } from "jotai";
import { render, screen } from "@testing-library/react";
import { createTheme, MantineProvider } from "@mantine/core";

import {
	atomsFrom,
	AtomsProvider,
	setStoreValues,
	type Store,
} from "testUtils";
import type { PlatformPlayer } from "~/lib/player";

import userEvent, { type UserEvent } from "@testing-library/user-event";

import Header from ".";

describe("Header", () => {
	let store: Store;
	let user: UserEvent;

	beforeEach(() => {
		vi.clearAllMocks();

		user = userEvent.setup();
		store = createStore();
	});

	const wrapper = ({ children }: React.PropsWithChildren) => (
		<AtomsProvider store={store}>
			<MantineProvider theme={createTheme({})}>{children}</MantineProvider>
		</AtomsProvider>
	);

	describe("With spotify player", () => {
		const player = {} as unknown as PlatformPlayer;
		let atoms: ReturnType<typeof atomsFrom>;

		beforeEach(() => {
			atoms = atomsFrom(store, "spotify");
		});

		it("Clears the entries", async () => {
			setStoreValues(store, [
				[atoms.entriesAtom, [{ timeMs: 1000 }, { timeMs: 2000 }]],
				[atoms.playerAtom, player],
			]);

			render(<Header />, { wrapper });

			expect(store.get(atoms.entriesAtom).map((e) => e.timeMs)).toEqual([
				1000, 2000,
			]);

			await user.click(screen.getByRole("button", { name: "Actions" }));

			await user.click(screen.getByRole("menuitem", { name: "Clear entries" }));

			expect(store.get(atoms.entriesAtom).map((e) => e.timeMs)).toEqual([0]);
		});
	});
});
