import { Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import type { PropsWithChildren } from "react";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type InitialValues = any[];

type Props = PropsWithChildren<{ initialValues: InitialValues }>;

const HydrateAtoms = ({ initialValues, children }: Props) => {
	useHydrateAtoms(initialValues);

	return children;
};

export const AtomsProvider = ({ initialValues, children }: Props) => (
	<Provider>
		<HydrateAtoms initialValues={initialValues}>{children}</HydrateAtoms>
	</Provider>
);
