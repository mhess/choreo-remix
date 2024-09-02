import { forwardRef } from "react";
import { Button, useComputedColorScheme } from "@mantine/core";
import type { ButtonProps, PolymorphicComponentProps } from "@mantine/core";

export default forwardRef<
	HTMLButtonElement,
	PolymorphicComponentProps<"button", ButtonProps>
>((props, ref) => {
	const isDark = useComputedColorScheme() === "dark";
	const btnColor = `var(--app-font-color${isDark ? "-dark" : ""})`;

	const newProps = { ...props };
	if (props.color === undefined) newProps.color = btnColor;

	return <Button ref={ref} variant="outline" {...newProps} />;
});
