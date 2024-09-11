import { Links, Meta, Scripts, ScrollRestoration } from "@remix-run/react";
import type { LinksFunction, MetaFunction } from "@remix-run/node";
import {
	Button,
	ColorSchemeScript,
	MantineProvider,
	createTheme,
} from "@mantine/core";
import "@mantine/core/styles.css";

import appStylesHref from "~/app.css?url";
import classes from "~/theme.module.css";

import breakpoints from "~/breakpoints";

import Editor from "~/components/Editor";
import Header from "~/components/Header";

const theme = createTheme({
	breakpoints,
	components: {
		TextInput: {
			defaultProps: { size: "xs" },
			classNames: { input: classes.textInput },
		},
		Button: Button.extend({
			defaultProps: { size: "compact-sm", variant: "default" },
			classNames: (_, props) => {
				const { variant, classNames } = props;
				let root = undefined;

				if (variant === "default") root = classes.defaultBtn;
				else if (variant === "outline") root = classes.outlineBtn;

				return { root, ...classNames };
			},
		}),
		Tooltip: { defaultProps: { withArrow: true } },
	},
});

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
];

export const Layout = ({ children }: { children: React.ReactNode }) => (
	<html lang="en">
		<head>
			<Meta />
			<Links />
			<ColorSchemeScript />
		</head>
		<body>
			<MantineProvider defaultColorScheme="auto" theme={theme}>
				{children}
			</MantineProvider>
			<ScrollRestoration />
			<Scripts />
		</body>
	</html>
);

export default function App() {
	return (
		<>
			<Header />
			<Editor />
		</>
	);
}
