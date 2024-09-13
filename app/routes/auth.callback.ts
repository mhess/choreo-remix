import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";

import { SPOTIFY_TOKEN_URL_PARAM } from "~/lib/spotify";

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url);
	const protocolAndHost = `${url.protocol}//${url.host}`;
	const code = url.searchParams.get("code");

	if (!code) throw json("No code recieved", { status: 404 });

	const clientId = process.env.SPOTIFY_CLIENT_ID;
	const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

	const data = {
		code,
		redirect_uri: `${protocolAndHost}/auth/callback`,
		grant_type: "authorization_code",
	};

	const formatted = new URLSearchParams(data).toString();

	const resp = await fetch("https://accounts.spotify.com/api/token", {
		method: "post",
		body: formatted,
		headers: {
			Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
			"Content-Type": "application/x-www-form-urlencoded",
		},
	});

	if (!resp.ok) throw json(`Resp status ${resp.status}`, { status: 404 });

	const { access_token: token } = await resp.json();

	if (!token) throw json("Token not recieved", { status: 404 });

	throw redirect(`/?${SPOTIFY_TOKEN_URL_PARAM}=${token}`);
}
