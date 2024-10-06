import {
	Button,
	Container,
	MantineProvider,
	TextInput,
	Tooltip,
	createTheme,
} from "@mantine/core";
import { createStore, Provider as JotaiProvider } from "jotai";
import { DevTools } from "jotai-devtools";
import "jotai-devtools/styles.css";

import "@mantine/core/styles.css";

import classes from "./App.module.css";

import { BreakpointProvider } from "~/lib/utils";
import { breakpoints } from "../shared";

import PlatformRouter from "~/components/PlatformRouter";
import Header from "~/components/Header";

const theme = createTheme({
	breakpoints,
	components: {
		TextInput: TextInput.extend({
			defaultProps: { size: "xs" },
			classNames: { input: classes.textInput },
		}),
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
		Tooltip: Tooltip.extend({ defaultProps: { withArrow: true } }),
		Container: Container.extend({ defaultProps: { size: "xs" } }),
	},
});

const store = createStore();

declare global {
	interface Window {
		store: typeof store;
	}
}

window.store = store;

export default function App() {
	return (
		<MantineProvider theme={theme}>
			<JotaiProvider store={store}>
				<DevTools store={store} />
				<BreakpointProvider>
					<Header />
					<PlatformRouter />
				</BreakpointProvider>
			</JotaiProvider>
		</MantineProvider>
	);
}
