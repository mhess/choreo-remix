import { type createStore, Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import type { PropsWithChildren } from "react";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type InitialValues = any[];

type Props = PropsWithChildren<{
	initialValues: InitialValues;
	store?: ReturnType<typeof createStore>;
}>;

const HydrateAtoms = ({ initialValues, children }: Props) => {
	useHydrateAtoms(initialValues);

	return children;
};

export const AtomsProvider = ({ initialValues, children, store }: Props) => (
	<Provider store={store}>
		<HydrateAtoms initialValues={initialValues}>{children}</HydrateAtoms>
	</Provider>
);
