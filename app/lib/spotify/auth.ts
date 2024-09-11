import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const SPOTIFY_TOKEN_URL_PARAM = "spotifyToken";

export const spotifyTokenAtom = atomWithStorage<string | undefined>(
	SPOTIFY_TOKEN_URL_PARAM,
	undefined,
);

export const resetSpotifyTokenAtom = atom(null, (_, set) =>
	set(spotifyTokenAtom, undefined),
);
