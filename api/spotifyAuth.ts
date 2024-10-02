import { spotifyTokenParam } from "../shared";
import { Buffer } from "node:buffer";

export const config = { runtime: "edge" };

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

export default async (request: Request) => {
	const url = new URL(request.url);
	const protocolAndHost = `${url.protocol}//${url.host}`;

	switch (url.pathname) {
		case "/api/login":
			return login(protocolAndHost);
		case "/api/callback":
			return await callback(protocolAndHost, url);
		default:
			return new Response(`Unknown path ${url.pathname}`, { status: 404 });
	}
};

const login = (protocolAndHost: string) => {
	const state = generateRandomString(16);
	const authParams = new URLSearchParams({
		response_type: "code",
		client_id: process.env.SPOTIFY_CLIENT_ID,
		scope: scope,
		redirect_uri: `${protocolAndHost}/api/callback`,
		state: state,
	} as Record<string, string>);

	const redirectUrl = `https://accounts.spotify.com/authorize/?${authParams.toString()}`;

	return new Response(null, {
		status: 302,
		headers: { Location: redirectUrl },
	});
};

const callback = async (protocolAndHost: string, url: URL) => {
	const code = url.searchParams.get("code");

	if (!code) return new Response("No code recieved", { status: 404 });

	const clientId = process.env.SPOTIFY_CLIENT_ID;
	const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

	const data = {
		code,
		redirect_uri: `${protocolAndHost}/api/callback`,
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

	if (!resp.ok)
		return new Response(`Account token resp status ${resp.status}`, {
			status: 404,
		});

	const { access_token: token } = (await resp.json()) as {
		access_token: string;
	};

	if (!token) return new Response("Token not recieved", { status: 404 });

	return new Response(null, {
		status: 302,
		headers: { Location: `/?${spotifyTokenParam}=${token}` },
	});
};
