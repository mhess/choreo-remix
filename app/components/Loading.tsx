import { Center, Loader } from "@mantine/core";

export default ({ message }: { message: React.ReactNode }) => (
	<Center className="flex-col">
		<Loader mb="0.5rem" color="var(--mantine-color-gray-7)" />
		{message}
	</Center>
);
