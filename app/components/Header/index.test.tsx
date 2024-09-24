import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore } from "jotai";
import { act, render, screen } from "@testing-library/react";
import { createTheme, MantineProvider } from "@mantine/core";

import {
	atomsFrom,
	AtomsProvider,
	setStoreValues,
	type Store,
} from "testUtils";
import type { PlatformPlayer } from "~/lib/player";
import { SPOTIFY_TOKEN_PARAM, spotifyTokenAtom } from "~/lib/spotify";

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

	describe("On the spotify platform", () => {
		const player = {} as unknown as PlatformPlayer;
		let atoms: ReturnType<typeof atomsFrom>;

		beforeEach(() => {
			atoms = atomsFrom(store, "spotify");
		});

		it('Renders "Log Out" button regardless of player when logged in', async () => {
			setStoreValues(store, [[spotifyTokenAtom, "auth-token-value"]]);

			render(<Header />, { wrapper });

			await user.click(screen.getByRole("button", { name: "Actions" }));

			await user.click(
				screen.getByRole("menuitem", { name: "Log Out of Spotify" }),
			);

			expect(
				screen.queryByRole("button", { name: "Actions" }),
			).not.toBeInTheDocument();

			expect(localStorage.getItem(SPOTIFY_TOKEN_PARAM)).toBe("null");
		});

		it(`Renders a "clear entries" button when the player is present`, async () => {
			setStoreValues(store, [
				[atoms.entriesAtom, [{ timeMs: 1000 }, { timeMs: 2000 }]],
				[atoms.playerAtom, player],
			]);

			render(<Header />, { wrapper });

			expect(store.get(atoms.entriesAtom).map((e) => e.timeMs)).toEqual([
				1000, 2000,
			]);

			await user.click(screen.getByRole("button", { name: "Actions" }));

			await user.click(
				await screen.findByRole("menuitem", { name: "Clear entries" }),
			);

			expect(store.get(atoms.entriesAtom).map((e) => e.timeMs)).toEqual([0]);
		});
	});
});
