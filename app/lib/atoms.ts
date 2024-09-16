import { atom, useAtom } from "jotai";

import { atoms as spotify } from "./spotify";
import { atoms as youtube } from "./youtube";
import { atoms as audioFile } from "./audioFile";

import type { PlatformAtoms, PlatformPlayer } from "./player";

export const platforms = [
	"youtube",
	"spotify",
	"audioFile",
	"landing",
] as const;

export type Platform = (typeof platforms)[number];

export const platformAtom = atom<Platform>("landing");

export const _TEST_ONLY_atomsByPlatfom = () => {
	if (!window.__testing__) throw "Only used for testing!";
	return atomsByPlatform;
};

const atomsByPlatform: Record<Platform, PlatformAtoms> = {
	spotify,
	youtube,
	audioFile,
	landing: {
		player: atom(),
		paused: atom(true),
		artist: atom(""),
		trackName: atom(""),
	},
};

export const playerAtom = atom(
	(get) => get(atomsByPlatform[get(platformAtom)].player) as PlatformPlayer,
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
