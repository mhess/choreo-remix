import { Links, Meta, Scripts, ScrollRestoration } from "@remix-run/react";
import type { LinksFunction, MetaFunction } from "@remix-run/node";
import { Center, ColorSchemeScript, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";

import appStylesHref from "./app.css?url";

import { useSpotifyAuth, AuthStatus } from "./lib/spotify";

import Editor from "./components/Editor";
import Landing from "./components/Landing";
import Icon from "./components/Icon";

export const meta: MetaFunction = () => [
	{ charSet: "utf-8" },
	{
		name: "viewport",
		content: "width=device-width,initial-scale=1",
	},
	{ title: "Choreo" },
	{ property: "og:title", content: "Choreo" },
	{
		name: "description",
		content: "Easily compose choreographies to music on Spotify",
	},
];

export const links: LinksFunction = () => [
	{ rel: "stylesheet", href: appStylesHref },
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200",
	},
];

export const Layout = ({ children }: { children: React.ReactNode }) => (
	<html lang="en">
		<head>
			<Meta />
			<Links />
			<ColorSchemeScript />
		</head>
		<body>
			<MantineProvider>{children}</MantineProvider>
			<ScrollRestoration />
			<Scripts />
		</body>
	</html>
);

export default function App() {
	const { status, token } = useSpotifyAuth();

	return status === AuthStatus.GOOD ? (
		<Editor token={token} />
	) : (
		<NotAuthenticated status={status} />
	);
}

const NotAuthenticated = ({ status }: { status: AuthStatus }) => (
	<Center className="h-full">
		{status === AuthStatus.LOADING ? (
			<Loading message="loading" />
		) : (
			<Landing /> // <Loading message="loading" />
		)}
	</Center>
);

const Loading = ({ message }: { message: React.ReactNode }) => (
	<Center className="flex-col">
		<Icon
			name="progress_activity"
			style={{ fontSize: "2.25rem" }}
			className="animate-spin"
		/>
		{message}
	</Center>
);
