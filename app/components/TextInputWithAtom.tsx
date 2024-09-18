import { TextInput } from "@mantine/core";
import type { TextInputProps } from "@mantine/core";
import { useAtom, type PrimitiveAtom } from "jotai";

type Props<T> = Omit<TextInputProps, "onChange"> & {
	atom: PrimitiveAtom<T>;
};

export default function <T extends string | number>(props: Props<T>) {
	const { atom, type, ...rest } = props;
	const [value, setValue] = useAtom(atom);

	const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = event.target.value;
		setValue((type === "number" ? ensureNumber(newValue) : newValue) as T);
	};

	const newProps = { ...rest, value, onChange };

	return <TextInput {...newProps} />;
}

const ensureNumber = (input: string): number => {
	const attempt = Number(input);
	return Number.isNaN(attempt) ? 0 : attempt;
};
