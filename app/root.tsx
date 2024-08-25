import { Links, Link, Meta, Outlet, Scripts } from "@remix-run/react";
import type { LinksFunction, MetaFunction } from "@remix-run/node";

import appStylesHref from "./app.css?url";
import { useSpotifyAuth, AuthStatus } from "./lib/spotify";
import Editor from "./components/Editor";

export const meta: MetaFunction = () => {
	return [
		{ title: "Choreo" },
		{
			property: "og:title",
			content: "Very cool app",
		},
		{
			name: "description",
			content: "Easily compose choreographies to music on Spotify",
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
		<html lang="en">
			<head>
				<link rel="icon" href="data:image/x-icon;base64,AA" />
				<Meta />
				<Links />
			</head>
			<body>
				{status === AuthStatus.GOOD ? (
					<Editor token={token} />
				) : (
					<NotAuthorized status={status} />
				)}
				<Outlet />
				<Scripts />
			</body>
		</html>
	);
}

const NotAuthorized = ({ status }: { status: AuthStatus }) => (
	<div className="status-message">
		{status === AuthStatus.LOADING ? (
			"Loading..."
		) : (
			<Link to="auth/login">Please log in with Spotify!</Link>
		)}
	</div>
);
