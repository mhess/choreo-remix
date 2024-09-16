import { type createStore, type WritableAtom, Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import type { PropsWithChildren } from "react";

// See https://github.com/pmndrs/jotai/discussions/2650 for more info on the typing here

// biome-ignore lint/suspicious/noExplicitAny: Need to allow any
type AnyWritableAtom = WritableAtom<unknown, any[], unknown>;
type InitialAtomValues = Array<readonly [AnyWritableAtom, unknown]>;

type Props = PropsWithChildren<{
	initialValues?: InitialAtomValues;
	store?: ReturnType<typeof createStore>;
}>;

const HydrateAtoms = ({ initialValues = [], children }: Props) => {
	useHydrateAtoms(initialValues);

	return children;
};

export const AtomsProvider = ({ initialValues, children, store }: Props) => (
	<Provider store={store}>
		<HydrateAtoms initialValues={initialValues}>{children}</HydrateAtoms>
	</Provider>
);
