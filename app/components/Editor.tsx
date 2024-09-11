import { useEffect } from "react";
import { useAtom } from "jotai";
import { useLocation } from "@remix-run/react";

import { platformAtom, useEstablishedPlayer, type Platform } from "~/lib/atoms";
import { SPOTIFY_TOKEN_URL_PARAM, spotifyTokenAtom } from "~/lib/spotify/auth";

import Landing from "./Landing";
import Entries from "./Entries";
import SpotifyEditor from "./SpotifyEditor";

export default () => {
	const platform = useSpotifyTokenForPlatform();

	switch (platform) {
		case "spotify":
			return <SpotifyEditor />;
		case "youtube":
			return <YoutubeEditor />;
		default:
			return <Landing />;
	}
};

export const useSpotifyTokenForPlatform = (): Platform => {
	const location = useLocation();
	const [atomPlatform, setAtomPlatform] = useAtom(platformAtom);
	const [, setToken] = useAtom(spotifyTokenAtom);
	const tokenInParams = new URLSearchParams(location.search).get(
		SPOTIFY_TOKEN_URL_PARAM,
	);

	useEffect(() => {
		if (!tokenInParams) return;

		setToken(tokenInParams);
		setAtomPlatform("spotify");

		const newUrl = new URL(window.location.href);
		newUrl.searchParams.delete(SPOTIFY_TOKEN_URL_PARAM);
		window.history.replaceState(null, "", newUrl);
	}, [tokenInParams, setAtomPlatform, setToken]);

	return tokenInParams ? "spotify" : atomPlatform;
};

const YoutubeEditor = () => {
	const player = useEstablishedPlayer();

	return player ? <Entries /> : <div>TODO</div>;
};
