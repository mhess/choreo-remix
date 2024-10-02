import { useEffect } from "react";
import { useAtom } from "jotai";

import { platformAtom } from "~/lib/platformAtoms";
import { spotifyTokenParam } from "~/../shared";

import { Spotify } from "~/platforms/spotify";
import { Youtube } from "~/platforms/youtube";
import { AudioFile } from "~/platforms/audioFile";
import Entries from "~/components/Entries";
import Landing from "./Landing";

export default function PlatformRouter() {
	const { platform, token } = useSpotifyTokenForPlatform();

	switch (platform) {
		case "spotify":
			return (
				<Spotify token={token}>
					<Entries />
				</Spotify>
			);
		case "youtube":
			return (
				<Youtube>
					<Entries />
				</Youtube>
			);
		case "audioFile":
			return (
				<AudioFile>
					<Entries />
				</AudioFile>
			);
		default:
			return <Landing />;
	}
}

const useSpotifyTokenForPlatform = () => {
	const [platform, setPlatform] = useAtom(platformAtom);

	const token = new URLSearchParams(window.location.search).get(
		spotifyTokenParam,
	);

	useEffect(() => {
		if (!token) return;

		setPlatform("spotify");

		const newUrl = new URL(window.location.href);
		newUrl.searchParams.delete(spotifyTokenParam);
		window.history.replaceState(null, "", newUrl);
	}, [token, setPlatform]);

	return { platform: token ? "spotify" : platform, token };
};
