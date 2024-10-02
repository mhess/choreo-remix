import { createTheme, MantineProvider } from "@mantine/core";
import { type WritableAtom, createStore, Provider } from "jotai";
import type { PropsWithChildren } from "react";
import { beforeEach } from "vitest";
import {
	type Platform,
	atomsForPlatformAtom,
	platformAtom,
} from "~/lib/platformAtoms";
import { entryAtomsForPlatformAtom } from "~/lib/entries";

// See https://github.com/pmndrs/jotai/discussions/2650 for more info on the typing here

// biome-ignore lint/suspicious/noExplicitAny: Need to allow any
type AnyWritableAtom = WritableAtom<unknown, any[], unknown>;
type AtomsAndValues = Array<readonly [AnyWritableAtom, unknown]>;

type Props = PropsWithChildren<{
	initialValues?: AtomsAndValues;
	store?: Store;
}>;

export type Store = ReturnType<typeof createStore>;

export const withStore = () => {
	let store: Store;

	beforeEach(() => {
		store = createStore();
	});

	const wrapper = ({ children }: PropsWithChildren) => (
		<Provider store={store}>
			<MantineProvider theme={createTheme({})}>{children}</MantineProvider>
		</Provider>
	);

	const setPlatform = (platform: Platform) => store.set(platformAtom, platform);

	const getAtoms = (platform?: Platform) => {
		platform && setPlatform(platform);
		const platformAtoms = store.get(atomsForPlatformAtom);
		const entryAtoms = store.get(entryAtomsForPlatformAtom);
		return { ...platformAtoms, ...entryAtoms };
	};

	const setAtoms = (pairs: AtomsAndValues) => {
		for (const [atom, value] of pairs) store.set(atom, value);
	};

	const getStore = () => store;

	return { setPlatform, getAtoms, setAtoms, getStore, wrapper };
};
