import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
	type Mock,
} from "vitest";
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
import type { AtomicEntry } from "~/lib/entries";

import userEvent, { type UserEvent } from "@testing-library/user-event";

import Header from "./Header";

const serializeEntryFrom = (store: Store) => (entry: AtomicEntry) => {
	const { timeMs } = entry;

	return {
		timeMs,
		count: store.get(entry.countAtom),
		note: store.get(entry.noteAtom),
	};
};

describe("Header", () => {
	let store: Store;
	let user: UserEvent;

	beforeEach(() => {
		vi.clearAllMocks();

		user = userEvent.setup();
		store = createStore();
	});

	afterEach(() => {
		vi.restoreAllMocks();
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

		it('Renders "Log Out" button when logged in regardless of player', async () => {
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

		it('Renders a "load entries" button when player is present', async () => {
			setStoreValues(store, [[atoms.playerAtom, player]]);

			render(<Header />, { wrapper });

			const fileInput = screen.getByLabelText("Upload CSV");
			fileInput.onclick = vi.fn();

			await user.click(screen.getByRole("button", { name: "Actions" }));

			await user.click(
				await screen.findByRole("menuitem", { name: "Load entries from CSV" }),
			);

			expect(fileInput.onclick).toHaveBeenCalledOnce();

			expect(window.alert).not.toHaveBeenCalled();

			await user.upload(
				fileInput,
				new File([], "test.csv", { type: "text/html" }),
			);

			expect(window.alert).toHaveBeenCalledOnce();
			expect(window.alert).toHaveBeenCalledWith(
				'File must be of type "text/csv"',
			);

			await user.upload(
				fileInput,
				new File([], "test.csv", { type: "text/csv" }),
			);

			expect(window.alert).toHaveBeenCalledTimes(2);
			expect(window.alert).toHaveBeenLastCalledWith(
				"CSV had errors Unable to auto-detect delimiting character; defaulted to ','",
			);

			const fileBits = `"count","timeMs","note"\r\n"1","0","first"\r\n"2","1000","second"\r\n"3","2000","third"`;

			await user.upload(
				fileInput,
				new File([fileBits], "test.csv", { type: "text/csv" }),
			);

			expect(
				store.get(atoms.entriesAtom).map(serializeEntryFrom(store)),
			).toEqual([
				{
					count: 1,
					note: "first",
					timeMs: 0,
				},
				{
					count: 2,
					note: "second",
					timeMs: 1000,
				},
				{
					count: 3,
					note: "third",
					timeMs: 2000,
				},
			]);
		});

		it('Renders a "save entries" button when player is present', async () => {
			setStoreValues(store, [
				[atoms.playerAtom, player],
				[
					atoms.entriesAtom,
					[
						{ count: 0, timeMs: 0, note: "first" },
						{ count: 1, timeMs: 100, note: "second" },
					],
				],
				[atoms.artistAtom, "artist"],
				[atoms.trackNameAtom, "Track Name"],
			]);

			(URL.createObjectURL as Mock).mockImplementation((blob: Blob) =>
				JSON.stringify(blob),
			);

			render(<Header />, { wrapper });

			await user.click(screen.getByRole("button", { name: "Actions" }));

			const handlerMock = vi.fn();

			const fakeAnchor = document.createElement("div");

			vi.spyOn(fakeAnchor, "click").mockImplementation(function (
				this: HTMLAnchorElement,
			) {
				const { href, download, style } = this;
				handlerMock("click", { href, download, height: style.height });
			});

			vi.spyOn(fakeAnchor, "remove").mockImplementation(() =>
				handlerMock("remove"),
			);

			const originalCreateElement = document.createElement;

			vi.spyOn(document, "createElement").mockImplementation(
				(...args: Parameters<typeof document.createElement>) => {
					if (args[0] === "a") return fakeAnchor;
					return originalCreateElement.call(document, ...args);
				},
			);

			await user.click(
				await screen.findByRole("menuitem", {
					name: "Save entries to CSV",
				}),
			);

			expect(handlerMock.mock.calls).toEqual([
				[
					"click",
					{
						download: "track_name.csv",
						height: "0px",
						href: expect.any(String),
					},
				],
				["remove"],
			]);

			const blobProperties = {
				bits: [
					'"count","timeMs","note"\r\n"0","0","first"\r\n"1","100","second"',
				],
				type: "text/csv",
			};

			expect(JSON.parse(handlerMock.mock.calls[0][1].href)).toEqual(
				blobProperties,
			);

			expect(
				JSON.parse((URL.revokeObjectURL as Mock).mock.calls[0][0]),
			).toEqual(blobProperties);
		});

		it(`Renders a "clear entries" button when player is present`, async () => {
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

			expect(
				store.get(atoms.entriesAtom).map(serializeEntryFrom(store)),
			).toEqual([{ count: 0, note: "Start", timeMs: 0 }]);
		});
	});
});
