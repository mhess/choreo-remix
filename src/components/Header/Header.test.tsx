import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
	type Mock,
} from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";

import { spotifyTokenParam } from "~/../shared";
import { withStore, type Store } from "~/test/utils";
import type { PlatformPlayer } from "~/lib/player";
import { spotifyTokenAtom } from "~/platforms/spotify";
import type { AtomicEntry } from "~/lib/entries";
import { platformAtom } from "~/lib/platformAtoms";

import Header from "./Header";

vi.mock("~/components/Logos", () => ({
	Spotify: () => <div data-testid="spotify-logo" />,
	YouTube: () => <div data-testid="youtube-logo" />,
	AudioFile: () => <div data-testid="audioFile-logo" />,
}));

const serializeEntryFrom = (store: Store) => (entry: AtomicEntry) => {
	const { timeMs } = entry;

	return {
		timeMs,
		count: store.get(entry.countAtom),
		note: store.get(entry.noteAtom),
	};
};

describe("Header", () => {
	let user: UserEvent;

	beforeEach(() => {
		vi.clearAllMocks();
		user = userEvent.setup();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const {
		wrapper: Wrapper,
		setPlatform,
		getAtoms,
		setAtoms,
		getStore,
	} = withStore();

	const mobileWrapper = ({ children }: React.PropsWithChildren) => (
		<Wrapper isMobile>{children}</Wrapper>
	);

	describe("On the landing page", () => {
		beforeEach(() => {
			setPlatform("landing");
		});

		describe("On desktop", () => {
			const wrapper = Wrapper;

			it("Renders platform menu, light/dark toggle, but no actions menu", async () => {
				render(<Header />, { wrapper });

				expect(
					screen.queryByRole("button", { name: "Actions" }),
				).not.toBeInTheDocument();

				expect(
					screen.getByRole("button", { name: "Toggle light/dark mode" }),
				).toBeInTheDocument();

				const selectPlatformBtn = screen.getByRole("button", {
					name: "Select Platform",
				});

				await user.hover(selectPlatformBtn);

				const menuItems = await screen.findAllByRole("menuitem");

				expect(menuItems.map((e) => e.textContent)).toEqual([
					"Spotify",
					"YouTube",
					"Audio File",
				]);

				await user.click(menuItems[1]);

				expect(getStore().get(platformAtom)).toEqual("youtube");
			});
		});

		describe("On mobile", () => {
			const wrapper = mobileWrapper;

			it("Renders only burger menu", async () => {
				render(<Header />, { wrapper });

				expect(
					screen.queryByRole("button", { name: "Actions" }),
				).not.toBeInTheDocument();

				expect(
					screen.queryByRole("button", { name: "Toggle light/dark mode" }),
				).not.toBeInTheDocument();

				expect(
					screen.queryByRole("button", {
						name: "Select Platform",
					}),
				).not.toBeInTheDocument();

				await user.click(screen.getByRole("button", { name: "Toggle menu" }));

				expect(
					(await screen.findAllByRole("menuitem")).map((e) => e.textContent),
				).toEqual(["Spotify", "YouTube", "Audio File", "Toggle light/dark"]);
			});
		});
	});

	describe("On the spotify platform", () => {
		const player = {} as unknown as PlatformPlayer;

		beforeEach(() => {
			setPlatform("spotify");
		});

		describe("On desktop", () => {
			const wrapper = Wrapper;

			it('Renders "Choreo" button which switches to landing page', async () => {
				setPlatform("spotify");
				render(<Header />, { wrapper });

				await user.click(screen.getByRole("button", { name: "Choreo" }));

				expect(getStore().get(platformAtom)).toEqual("landing");
			});

			it('Renders "Log Out" button when logged in', async () => {
				setAtoms([[spotifyTokenAtom, "auth-token-value"]]);
				render(<Header />, { wrapper });

				await user.hover(screen.getByRole("button", { name: "Actions" }));

				await user.click(
					await screen.findByRole("menuitem", { name: "Log out of Spotify" }),
				);

				expect(
					screen.queryByRole("button", { name: "Actions" }),
				).not.toBeInTheDocument();

				expect(localStorage.getItem(spotifyTokenParam)).toBe("null");
			});

			it('Renders a "load entries" button when player is present', async () => {
				const { playerAtom, entriesAtom } = getAtoms("spotify");
				setAtoms([[playerAtom, player]]);
				const store = getStore();

				render(<Header />, { wrapper });

				const fileInput = screen.getByLabelText("Upload CSV");
				fileInput.onclick = vi.fn();

				await user.hover(screen.getByRole("button", { name: "Actions" }));

				await user.click(
					await screen.findByRole("menuitem", {
						name: "Load entries from CSV",
					}),
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

				expect(store.get(entriesAtom).map(serializeEntryFrom(store))).toEqual([
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
				const { playerAtom, entriesAtom, artistAtom, trackNameAtom } =
					getAtoms("spotify");
				setAtoms([
					[playerAtom, player],
					[
						entriesAtom,
						[
							{ count: 0, timeMs: 0, note: "first" },
							{ count: 1, timeMs: 100, note: "second" },
						],
					],
					[artistAtom, "artist"],
					[trackNameAtom, "Track Name"],
				]);

				(URL.createObjectURL as Mock).mockImplementation((blob: Blob) =>
					JSON.stringify(blob),
				);

				render(<Header />, { wrapper });

				await user.hover(screen.getByRole("button", { name: "Actions" }));

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
				const store = getStore();
				const { playerAtom, entriesAtom } = getAtoms("spotify");
				setAtoms([
					[entriesAtom, [{ timeMs: 1000 }, { timeMs: 2000 }]],
					[playerAtom, player],
				]);

				render(<Header />, { wrapper });

				expect(store.get(entriesAtom).map((e) => e.timeMs)).toEqual([
					1000, 2000,
				]);

				await user.hover(screen.getByRole("button", { name: "Actions" }));

				await user.click(
					await screen.findByRole("menuitem", { name: "Clear entries" }),
				);

				expect(store.get(entriesAtom).map(serializeEntryFrom(store))).toEqual([
					{ count: 0, note: "Start", timeMs: 0 },
				]);
			});
		});

		describe("On mobile", () => {
			const wrapper = mobileWrapper;

			it('Renders "Choreo" button which switches to landing page', async () => {
				setPlatform("spotify");
				render(<Header />, { wrapper });

				await user.click(screen.getByRole("button", { name: "Choreo" }));

				expect(getStore().get(platformAtom)).toEqual("landing");
			});

			it('Renders "Log Out" button when logged in', async () => {
				setAtoms([[spotifyTokenAtom, "auth-token-value"]]);
				render(<Header />, { wrapper });

				await user.click(screen.getByRole("button", { name: "Toggle menu" }));

				await user.click(
					await screen.findByRole("menuitem", { name: "Log out of Spotify" }),
				);

				expect(localStorage.getItem(spotifyTokenParam)).toBe("null");

				await user.click(
					await screen.findByRole("button", { name: "Toggle menu" }),
				);

				await screen.findAllByRole("menuitem");

				expect(
					screen.queryByRole("menuitem", { name: "Log out of Spotify" }),
				).not.toBeInTheDocument();
			});
		});
	});
});
