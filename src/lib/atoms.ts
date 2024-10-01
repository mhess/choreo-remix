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

const atomsByPlatform: Record<Platform, PlatformAtoms> = {
	spotify,
	youtube,
	audioFile,
	landing: {
		playerAtom: atom(),
		pausedAtom: atom(true),
		artistAtom: atom(""),
		trackNameAtom: atom(""),
	},
};

export const atomsForPlatformAtom = atom(
	(get) => atomsByPlatform[get(platformAtom)],
);

export const playerAtom = atom(
	(get) => get(get(atomsForPlatformAtom).playerAtom) as PlatformPlayer,
);

export const playerPausedAtom = atom(
	(get) => get(get(atomsForPlatformAtom).pausedAtom) as boolean,
);

export const artistAtom = atom(
	(get) => get(get(atomsForPlatformAtom).artistAtom) as string,
);

export const trackNameAtom = atom(
	(get) => get(get(atomsForPlatformAtom).trackNameAtom) as string,
);

export const useEstablishedPlayer = () =>
	useAtom(playerAtom)[0] as PlatformPlayer;
