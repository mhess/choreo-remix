import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	test,
	vi,
	type Mock,
} from "vitest";
import { act, render, screen, within } from "@testing-library/react";

import { withStore } from "~/test/utils";
import { FakeSpotifyPlayer } from "./fakePlayer";
import { PlatformPlayer } from "~/lib/player";
import { spotifyTokenAtom } from "./internals";
import { spotifyTokenParam } from "~/../shared";

import SpotifyComponent from "./Spotify";

const noDomChange = (container: HTMLElement, timeout = 100) =>
	new Promise<boolean>((resolve) => {
		const observer = new MutationObserver(() => {
			resolve(false);
		});
		observer.observe(container, { childList: true, subtree: true });
		setTimeout(() => resolve(true), timeout);
	});

const expectOnly = (
	container: HTMLElement,
	getEl: () => HTMLElement,
	timeout = 1000,
): Promise<HTMLElement> =>
	new Promise((resolve, reject) => {
		const callback = () => {
			try {
				resolve(getEl());
			} catch (e) {
				reject(e);
			}
		};

		const observer = new MutationObserver(callback);

		setTimeout(callback, timeout);

		observer.observe(container, { childList: true, subtree: true });
	});

describe("Spotify", () => {
	const { wrapper, getAtoms, setAtoms, getStore } = withStore();
	let spotifyPlayer: FakeSpotifyPlayer;

	beforeEach(() => {
		vi.clearAllMocks();

		spotifyPlayer = new FakeSpotifyPlayer({
			name: "foo",
			getOAuthToken: () => {},
		});

		vi.spyOn(spotifyPlayer, "connect").mockReturnValue(Promise.resolve(true));

		window.Spotify = {
			Player: vi.fn(() => spotifyPlayer) as unknown as typeof Spotify.Player,
		};

		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
		localStorage.clear();
	});

	it("Renders log in screen when not logged in", async () => {
		const { container } = render(
			<SpotifyComponent token={null}>
				<div data-testid="entries" />
			</SpotifyComponent>,
			{ wrapper },
		);

		const link = await expectOnly(container, () =>
			screen.getByRole("link", { name: /^log\sin$/ }),
		);

		expect(screen.queryByTestId("entries")).not.toBeInTheDocument();

		expect(link).toHaveAttribute("href", "/api/login");
	});

	const assertElHasFullMsgAndLink = (el: HTMLElement, msg: string) => {
		expect(el).toHaveTextContent(
			`${msg} Would you like to try to log in to Spotify again?`,
		);
		const link = within(el).getByRole("link", { name: /^log\sin$/ });
		expect(link).toHaveAttribute("href", "/api/login");
	};

	it("Renders message on initialization error", async () => {
		const msg = "Initialization failed.";
		const { rerender, container } = render(
			<SpotifyComponent token="testToken">
				<div data-testid="entries" />
			</SpotifyComponent>,
			{ wrapper },
		);

		screen.getByText("Connecting to Spotify");

		rerender(
			<SpotifyComponent token={null}>
				<div data-testid="entries" />
			</SpotifyComponent>,
		);

		screen.getByText("Connecting to Spotify");

		(spotifyPlayer.connect as Mock).mockReturnValue(Promise.resolve(false));

		window.onSpotifyWebPlaybackSDKReady();

		const msgEl = await expectOnly(container, () =>
			screen.getByText(new RegExp(`^${msg}`)),
		);

		assertElHasFullMsgAndLink(msgEl, msg);
	});

	const testMessageAfterError = async (
		_: string,
		msg: string,
		afterPlayerCreation: () => void,
	) => {
		const { rerender, container } = render(
			<SpotifyComponent token="testToken">
				<div data-testid="entries" />
			</SpotifyComponent>,
			{ wrapper },
		);

		screen.getByText("Connecting to Spotify");

		rerender(
			<SpotifyComponent token={null}>
				<div data-testid="entries" />
			</SpotifyComponent>,
		);

		screen.getByText("Connecting to Spotify");

		window.onSpotifyWebPlaybackSDKReady();

		await expectOnly(container, () =>
			screen.getByText(
				`Please connect to the "Choreo Player" device in the Spotify player.`,
			),
		);

		afterPlayerCreation();

		const msgEl = await expectOnly(container, () =>
			screen.getByText(new RegExp(`^${msg}`)),
		);

		assertElHasFullMsgAndLink(msgEl, msg);
	};

	test.each([
		[
			"Renders message on playback error",
			"There was an error with playback.",
			() => {
				spotifyPlayer.emit("playback_error", { err: "playback" });
				expect(console.error).toHaveBeenCalledOnce();
				expect(console.error).toHaveBeenCalledWith(
					'playback error {"err":"playback"}',
				);
			},
		],
		[
			"Renders message on account error",
			"There was a problem with your account. Spotify requires a premium account for application access.",
			() => spotifyPlayer.emit("account_error"),
		],
		[
			"Renders message on auth error",
			"Could not authorize access.",
			() => spotifyPlayer.emit("authentication_error"),
		],
	])("%s", testMessageAfterError);

	const testEntriesRenderedAndPlayer = async (container: HTMLElement) => {
		expect(screen.getByText("Connecting to Spotify")).toBeInTheDocument();

		expect(screen.queryByTestId("entries")).not.toBeInTheDocument();

		await expect(noDomChange(container)).resolves.toBeTruthy();

		window.onSpotifyWebPlaybackSDKReady();

		await expectOnly(container, () =>
			screen.getByText(
				`Please connect to the "Choreo Player" device in the Spotify player.`,
			),
		);

		expect(screen.queryByTestId("entries")).not.toBeInTheDocument();

		await expect(noDomChange(container)).resolves.toBeTruthy();

		expect(Spotify.Player).toHaveBeenCalledOnce();

		const [[playerInit]] = (Spotify.Player as Mock).mock.calls;
		expect(playerInit).toEqual({
			name: "Choreo Player",
			volume: 0.5,
			getOAuthToken: expect.any(Function),
		});

		const mock = vi.fn();
		playerInit.getOAuthToken(mock);
		expect(mock).toHaveBeenCalledOnce();
		expect(mock).toHaveBeenCalledWith("testToken");

		spotifyPlayer._setPlayerReady();

		await expectOnly(container, () => screen.getByTestId("entries"));

		const { playerAtom, pausedAtom, artistAtom, trackNameAtom } =
			getAtoms("spotify");
		const store = getStore();

		const player = store.get(playerAtom) as PlatformPlayer;

		expect(store.get(pausedAtom)).toBe(true);
		expect(store.get(artistAtom)).toEqual("First Artist");
		expect(store.get(trackNameAtom)).toEqual(
			"Track Name! That is Really Really Long",
		);

		expect(player).toBeInstanceOf(PlatformPlayer);

		vi.useFakeTimers();

		const tickMock = vi.fn();

		await player.addOnTick(tickMock);
		expect(tickMock).toHaveBeenCalledOnce();
		expect(tickMock).toHaveBeenCalledWith(0);

		await player.play();

		expect(store.get(pausedAtom)).toBe(false);

		await act(() => vi.advanceTimersByTime(50));

		expect(await player.getCurrentTime()).toEqual(50);

		await act(() => vi.advanceTimersByTime(50));

		expect(tickMock).toHaveBeenCalledTimes(2);
		expect(tickMock).toHaveBeenLastCalledWith(100);

		expect(await player.getCurrentTime()).toEqual(100);

		await player.pause();

		expect(store.get(pausedAtom)).toBe(true);

		expect(await player.getCurrentTime()).toEqual(100);

		await act(() => vi.advanceTimersByTime(100));

		expect(tickMock).toHaveBeenCalledTimes(2);

		await act(() => player.seekTo(1000));

		expect(await player.getCurrentTime()).toEqual(1000);

		expect(tickMock).toHaveBeenCalledTimes(3);
		expect(tickMock).toHaveBeenLastCalledWith(1000);
	};

	it("Renders loading screens, entries, and creates player with token from params", async () => {
		localStorage.clear();
		const { rerender, container } = render(
			<SpotifyComponent token="testToken">
				<div data-testid="entries" />
			</SpotifyComponent>,
			{ wrapper },
		);

		expect(screen.getByText("Connecting to Spotify")).toBeInTheDocument();

		rerender(
			<SpotifyComponent token={null}>
				<div data-testid="entries" />
			</SpotifyComponent>,
		);

		expect(localStorage.getItem(spotifyTokenParam)).toEqual(
			JSON.stringify("testToken"),
		);

		await testEntriesRenderedAndPlayer(container);
	});

	it("Renders loading screens, entries, and creates player with token from localStorage", async () => {
		setAtoms([[spotifyTokenAtom, "testToken"]]);

		const { container } = render(
			<SpotifyComponent token={null}>
				<div data-testid="entries" />
			</SpotifyComponent>,
			{ wrapper },
		);

		await testEntriesRenderedAndPlayer(container);
	});

	it("Only creates a single player after remounting", async () => {
		setAtoms([[spotifyTokenAtom, "testToken"]]);

		const { unmount } = render(
			<SpotifyComponent token={null}>
				<div data-testid="entries" />
			</SpotifyComponent>,
			{ wrapper },
		);

		unmount();

		const { container } = render(
			<SpotifyComponent token={null}>
				<div data-testid="entries" />
			</SpotifyComponent>,
			{ wrapper },
		);

		window.onSpotifyWebPlaybackSDKReady();

		await expectOnly(container, () =>
			screen.getByText(
				`Please connect to the "Choreo Player" device in the Spotify player.`,
			),
		);

		expect(Spotify.Player).toHaveBeenCalledOnce();
	});
});
