import {
	json,
	Links,
	Link,
	Meta,
	Outlet,
	Scripts,
	useLocation,
} from "@remix-run/react";
import Editor from "./components/Editor";

import type { LinksFunction } from "@remix-run/node";

import appStylesHref from "./app.css?url";
import { useEffect, useState } from "react";

export const links: LinksFunction = () => [
	{ rel: "stylesheet", href: appStylesHref },
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200",
	},
];

const useAuthToken = () => {
	const [token, setToken] = useState<string>();
	const location = useLocation();
	const tokenInParams = new URLSearchParams(location.search).get("token");

	useEffect(() => {
		if (!tokenInParams) return;
		setToken(tokenInParams);
		const newUrl = new URL(window.location.href);
		newUrl.searchParams.delete("token");
		window.history.pushState(null, "", newUrl);
	}, [tokenInParams]);

	return token;
};

export default function App() {
	useEffect(() => {
		console.log("root mounted");
		return () => console.log("root unmounted");
	}, []);

	const token = useAuthToken();

	return (
		<html lang="en">
			<head>
				<link rel="icon" href="data:image/x-icon;base64,AA" />
				<Meta />
				<Links />
			</head>
			<body>
				{token ? (
					<Editor token={token} />
				) : (
					<Link to="auth/login">Please Log in!</Link>
				)}
				<Outlet />
				<Scripts />
			</body>
		</html>
	);
}
