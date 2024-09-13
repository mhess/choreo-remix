import { atom, useAtom } from "jotai";
import type { Atom } from "jotai";
import {
	spotifyPlayerAtom,
	spotifyPausedAtom,
	spotifyArtistAtom,
	spotifyTrackNameAtom,
} from "./spotify";
import type { Player } from "./player";
import {
	youTubePlayerAtom,
	youTubePausedAtom,
	youTubeTrackNameAtom,
	youTubeArtistAtom,
} from "./youtube";

export type Platform = "youtube" | "spotify" | "landing";

export const platformAtom = atom<Platform>("landing");

const atomsByPlatform: Record<
	Platform,
	Record<string, Atom<Player | undefined | boolean | string>>
> = {
	spotify: {
		player: spotifyPlayerAtom,
		paused: spotifyPausedAtom,
		artist: spotifyArtistAtom,
		trackName: spotifyTrackNameAtom,
	},
	youtube: {
		player: youTubePlayerAtom,
		paused: youTubePausedAtom,
		artist: youTubeArtistAtom,
		trackName: youTubeTrackNameAtom,
	},
	landing: {
		player: atom(undefined),
		paused: atom(true),
		artist: atom(""),
		trackName: atom(""),
	},
};

export const playerAtom = atom(
	(get) => get(atomsByPlatform[get(platformAtom)].player) as Player,
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

export const useEstablishedPlayer = () => useAtom(playerAtom)[0] as Player;
