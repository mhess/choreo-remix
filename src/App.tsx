import { Button, MantineProvider, createTheme } from "@mantine/core";
import { Provider as JotaiProvider } from "jotai";

import "@mantine/core/styles.css";

import classes from "./App.module.css";

import { breakpoints } from "../shared";

import PlatformRouter from "~/components/PlatformRouter";
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
		Container: { defaultProps: { size: "xs" } },
	},
});

export default function App() {
	return (
		<MantineProvider theme={theme}>
			<JotaiProvider>
				<Header />
				<PlatformRouter />
			</JotaiProvider>
		</MantineProvider>
	);
}
