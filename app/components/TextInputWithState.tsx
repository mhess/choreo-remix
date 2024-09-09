import { TextInput } from "@mantine/core";
import type { TextInputProps } from "@mantine/core";
import { useState } from "react";

type Props = Omit<TextInputProps, "onChange"> & {
	initValue: string;
	onChange: (input: string) => void;
};

export default (props: Props) => {
	const { initValue, onChange: onChangeFromProps, ...rest } = props;

	const [value, setValue] = useState(initValue);

	const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = event.target.value;
		onChangeFromProps?.(newValue);
		setValue(newValue);
	};

	const newProps = { ...rest, value, onChange };

	return <TextInput {...newProps} />;
};
