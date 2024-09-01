import { Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

type TooltipProps = Parameters<typeof Tooltip>[0];

export default (props: TooltipProps) => {
	const [isOpen, { open, close }] = useDisclosure(false);

	const newProps = { ...props };

	if (!newProps.opened) {
		newProps.onMouseEnter = open;
		newProps.onMouseLeave = close;
		newProps.onClick = open;
		newProps.opened = isOpen;
	}

	return <Tooltip {...newProps} />;
};
