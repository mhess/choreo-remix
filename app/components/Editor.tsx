import { useEffect } from "react";
import { useAtom } from "jotai";
import { useLocation } from "@remix-run/react";

import { platformAtom, type Platform } from "~/lib/atoms";
import { SPOTIFY_TOKEN_PARAM, spotifyTokenAtom } from "~/lib/spotify";
import { useSetUpEntries } from "~/lib/entries";

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

const useSpotifyTokenForPlatform = (): Platform => {
	const location = useLocation();
	const [platform, setPlatform] = useAtom(platformAtom);
	const [, setToken] = useAtom(spotifyTokenAtom);
	const tokenInParams = new URLSearchParams(location.search).get(
		SPOTIFY_TOKEN_PARAM,
	);

	useEffect(() => {
		if (!tokenInParams) return;

		setToken(tokenInParams);
		setPlatform("spotify");

		const newUrl = new URL(window.location.href);
		newUrl.searchParams.delete(SPOTIFY_TOKEN_PARAM);
		window.history.replaceState(null, "", newUrl);
	}, [tokenInParams, setPlatform, setToken]);

	return tokenInParams ? "spotify" : platform;
};
