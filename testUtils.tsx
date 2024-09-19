import { type createStore, type WritableAtom, Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import type { PropsWithChildren } from "react";
import { type Platform, atomsForPlatformAtom, platformAtom } from "~/lib/atoms";
import { entryAtomsForPlatformAtom } from "~/lib/entries";

// See https://github.com/pmndrs/jotai/discussions/2650 for more info on the typing here

// biome-ignore lint/suspicious/noExplicitAny: Need to allow any
type AnyWritableAtom = WritableAtom<unknown, any[], unknown>;
type InitialAtomValues = Array<readonly [AnyWritableAtom, unknown]>;

type Props = PropsWithChildren<{
	initialValues?: InitialAtomValues;
	store?: Store;
}>;

const HydrateAtoms = ({ initialValues = [], children }: Props) => {
	useHydrateAtoms(initialValues);

	return children;
};

export type Store = ReturnType<typeof createStore>;

export const AtomsProvider = ({ initialValues, children, store }: Props) => (
	<Provider store={store}>
		<HydrateAtoms initialValues={initialValues}>{children}</HydrateAtoms>
	</Provider>
);

export const atomsFrom = (store: Store, platform: Platform) => {
	store.set(platformAtom, platform);
	const platformAtoms = store.get(atomsForPlatformAtom);
	const entryAtoms = store.get(entryAtomsForPlatformAtom);
	return { ...platformAtoms, ...entryAtoms };
};

export const setStoreValues = (store: Store, pairs: InitialAtomValues) => {
	for (const [atom, value] of pairs) store.set(atom, value);
};
