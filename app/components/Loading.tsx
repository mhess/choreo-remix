import { Loader, Stack } from "@mantine/core";

export default ({ message }: { message: React.ReactNode }) => (
	<Stack align="center">
		<Loader color="var(--mantine-color-gray-7)" />
		{message}
	</Stack>
);
