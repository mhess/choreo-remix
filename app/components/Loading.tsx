import { Loader, Stack } from "@mantine/core";

export default function Loading({ message }: { message: React.ReactNode }) {
	return (
		<Stack align="center">
			<Loader color="var(--mantine-color-gray-7)" />
			{message}
		</Stack>
	);
}
