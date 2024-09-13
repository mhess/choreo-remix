import { useEffect } from "react";
import { useAtom } from "jotai";
import { useLocation } from "@remix-run/react";

import { platformAtom, type Platform } from "~/lib/atoms";
import { SPOTIFY_TOKEN_URL_PARAM, spotifyTokenAtom } from "~/lib/spotify";
import { entriesAtom, useEntries } from "~/lib/entries";

import Landing from "./Landing";
import SpotifyEditor from "./SpotifyEditor";
import YoutubeEditor from "./YoutubeEditor";
import AudioFileEditor from "./AudioFileEditor";

export default () => {
	useSetUpEntries();
	const platform = useSpotifyTokenForPlatform();

	switch (platform) {
		case "spotify":
			return <SpotifyEditor />;
		case "youtube":
			return <YoutubeEditor />;
		case "audioFile":
			return <AudioFileEditor />;
		default:
			return <Landing />;
	}
};

const useSetUpEntries = () => {
	const entries = useEntries();
	const [, setEntries] = useAtom(entriesAtom);

	useEffect(() => {
		setEntries(entries);
	}, [entries, setEntries]);
};

const useSpotifyTokenForPlatform = (): Platform => {
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
