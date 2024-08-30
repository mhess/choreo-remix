import { Links, Link, Meta, Outlet, Scripts } from "@remix-run/react";
import type { LinksFunction, MetaFunction } from "@remix-run/node";

import appStylesHref from "./app.css?url";

import { useSpotifyAuth, AuthStatus } from "./lib/spotify";

import Editor from "./components/Editor";
import Landing from "./components/Landing";
import Icon from "./components/Icon";

export const meta: MetaFunction = () => {
	return [
		{ title: "Choreo" },
		{ property: "og:title", content: "Choreo" },
		{
			name: "description",
			content: "Easily compose choreographies to music on Spotify",
		},
		{
			name: "viewport",
			content: "width=device-width,initial-scale=1",
		},
	];
};

export const links: LinksFunction = () => [
	{ rel: "stylesheet", href: appStylesHref },
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200",
	},
];

export default function App() {
	const { status, token } = useSpotifyAuth();

	return (
		<html lang="en" className="">
			<head>
				<link rel="icon" href="data:image/x-icon;base64,AA" />
				<Meta />
				<Links />
			</head>
			<body>
				{status === AuthStatus.GOOD ? (
					<Editor token={token} />
				) : (
					<NotAuthenticated status={status} />
				)}
				<Outlet />
				<Scripts />
			</body>
		</html>
	);
}

const NotAuthenticated = ({ status }: { status: AuthStatus }) => (
	<div className="flex justify-center items-center h-full">
		{status === AuthStatus.LOADING ? <Loading /> : <Landing />}
	</div>
);

const Loading = ({ message }: { message?: string }) => {
	return (
		<div className="flex flex-col items-center">
			<Icon name="progress_activity" className="animate-spin" />
			{message ? message : "loading"}
		</div>
	);
};
