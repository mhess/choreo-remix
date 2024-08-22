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

enum AuthStatus {
	LOADING = "loading",
	NO_AUTH = "noAuth",
}

const useAuth = () => {
	// Can't just grab the token from localStorage bc it's only available
	// on the browser. Remix also renders this component on the server >:[
	const [token, setToken] = useState<string>();
	const [status, setStatus] = useState(AuthStatus.LOADING);
	const location = useLocation();
	const tokenInParams = new URLSearchParams(location.search).get("token");

	useEffect(() => {
		if (token) return;
		if (tokenInParams) {
			setToken(tokenInParams);
			localStorage.setItem("authToken", tokenInParams);
			const newUrl = new URL(window.location.href);
			newUrl.searchParams.delete("token");
			window.history.pushState(null, "", newUrl);
			return;
		}

		const tokenFromLS = localStorage.getItem("authToken");
		if (tokenFromLS) {
			setToken(tokenFromLS);
			return;
		}

		setStatus(AuthStatus.NO_AUTH);
	}, [tokenInParams]);

	return { status, token };
};

export default function App() {
	const { status, token } = useAuth();

	return (
		<html lang="en">
			<head>
				<link rel="icon" href="data:image/x-icon;base64,AA" />
				<Meta />
				<Links />
			</head>
			<body>
				{token ? <Editor token={token} /> : <NotAuthorized status={status} />}
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
			<Link to="auth/login">Please Log in!</Link>
		)}
	</div>
);
