import { useEffect } from "react";
import { useAtom } from "jotai";

import { platformAtom } from "~/lib/atoms";
import { SPOTIFY_TOKEN_PARAM } from "~/lib/spotify";

import Landing from "./Landing";
import SpotifyEditor from "./SpotifyEditor";
import YoutubeEditor from "./YoutubeEditor";
import AudioFileEditor from "./AudioFileEditor";

export default function PlatformRouter() {
	const { platform, token } = useSpotifyTokenForPlatform();

	switch (platform) {
		case "spotify":
			return <SpotifyEditor token={token} />;
		case "youtube":
			return <YoutubeEditor />;
		case "audioFile":
			return <AudioFileEditor />;
		default:
			return <Landing />;
	}
}

const useSpotifyTokenForPlatform = () => {
	const [platform, setPlatform] = useAtom(platformAtom);

	const token = new URLSearchParams(window.location.search).get(
		SPOTIFY_TOKEN_PARAM,
	);

	useEffect(() => {
		if (!token) return;

		setPlatform("spotify");

		const newUrl = new URL(window.location.href);
		newUrl.searchParams.delete(SPOTIFY_TOKEN_PARAM);
		window.history.replaceState(null, "", newUrl);
	}, [token, setPlatform]);

	return { platform: token ? "spotify" : platform, token };
};
