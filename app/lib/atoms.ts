import { atom, useAtom } from "jotai";
import type { Atom } from "jotai";
import { spotifyPlaybackStateAtom, spotifyPlayerAtom } from "./spotify/player";
import type { Player } from "./player";
import { youTubePlayerAtom, youTubePlayerStateAtom } from "./youtube";

export type Platform = "youtube" | "spotify" | "landing";

export const platformAtom = atom<Platform>("youtube");

const playerAtomByPlatform: Record<Platform, Atom<Player | undefined>> = {
	spotify: spotifyPlayerAtom,
	youtube: youTubePlayerAtom,
	landing: atom(undefined),
};

export const playerAtom = atom((get) =>
	get(playerAtomByPlatform[get(platformAtom)]),
);

export const playerPausedAtom = atom<boolean>((get) => {
	const platform = get(platformAtom);

	if (platform === "spotify")
		return get(spotifyPlaybackStateAtom)?.paused as boolean;
	// Can't use YT.PlayerState.PLAYING bc that variable doesn't exist on server
	// 1 = YT.PlayerState.PLAYING
	if (platform === "youtube") return get(youTubePlayerStateAtom) !== 1;
	return true;
});

export const useEstablishedPlayer = () => useAtom(playerAtom)[0] as Player;
