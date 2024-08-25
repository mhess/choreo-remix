import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

const generateRandomString = (length: number) => {
	let text = "";
	const possible =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	for (let i = 0; i < length; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
};

const scope = "streaming user-read-email user-read-private";

export async function loader({ request }: LoaderFunctionArgs) {
	const state = generateRandomString(16);

	const authParams = new URLSearchParams({
		response_type: "code",
		client_id: process.env.SPOTIFY_CLIENT_ID,
		scope: scope,
		redirect_uri: `${new URL(request.url).host}/auth/callback`,
		state: state,
	} as Record<string, string>);

	const redirectUrl = `https://accounts.spotify.com/authorize/?${authParams.toString()}`;

	throw redirect(redirectUrl);
}
