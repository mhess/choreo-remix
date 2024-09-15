import { atom, useAtom } from "jotai";

import { atoms as spotify } from "./spotify";
import { atoms as youtube } from "./youtube";
import { atoms as audioFile } from "./audioFile";

import type { PlaformAtoms, PlatformPlayer } from "./player";

export const platforms = [
	"youtube",
	"spotify",
	"audioFile",
	"landing",
] as const;

export type Platform = (typeof platforms)[number];

export const platformAtom = atom<Platform>("landing");

const atomsByPlatform: Record<
	Platform,
	Record<keyof PlaformAtoms, PlaformAtoms[keyof PlaformAtoms]>
> = {
	spotify,
	youtube,
	audioFile,
	landing: {
		player: atom(undefined),
		paused: atom(true),
		artist: atom(""),
		trackName: atom(""),
	},
};

const testPlayerAtom = atom<PlatformPlayer>();
export const _TEST_ONLY_playerAtom = atom(
	null,
	(_, set, player: PlatformPlayer) => {
		if (!window.__testing__) throw `Can only set "playerAtom" in tests!`;
		set(testPlayerAtom, player);
	},
);

export const playerAtom = atom(
	(get) =>
		get(testPlayerAtom) ||
		(get(atomsByPlatform[get(platformAtom)].player) as PlatformPlayer),
);

export const playerPausedAtom = atom(
	(get) => get(atomsByPlatform[get(platformAtom)].paused) as boolean,
);

export const artistAtom = atom(
	(get) => get(atomsByPlatform[get(platformAtom)].artist) as string,
);

export const trackNameAtom = atom(
	(get) => get(atomsByPlatform[get(platformAtom)].trackName) as string,
);

export const useEstablishedPlayer = () =>
	useAtom(playerAtom)[0] as PlatformPlayer;
