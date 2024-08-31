import { Center } from "@mantine/core";
import Icon from "./Icon";

export default ({ message }: { message: React.ReactNode }) => (
	<Center className="flex-col">
		<Icon
			name="progress_activity"
			style={{ fontSize: "2.25rem" }}
			className="animate-spin"
		/>
		{message}
	</Center>
);
