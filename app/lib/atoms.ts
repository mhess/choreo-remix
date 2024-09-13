import { atom, useAtom } from "jotai";

import { atoms as spotify } from "./spotify";
import { atoms as youtube } from "./youtube";
import { atoms as audioFile } from "./audioFile";
import type { PlaformAtoms, PlatformPlayer } from "./player";

export type Platform = "youtube" | "spotify" | "audioFile" | "landing";

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
