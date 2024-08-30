import type { HTMLProps } from "react";

export default ({
	name,
	...props
}: { name: string } & HTMLProps<HTMLSpanElement>) => {
	const { className, ...rest } = props;

	return (
		<span className={`material-symbols-outlined ${className}`} {...rest}>
			{name}
		</span>
	);
};
