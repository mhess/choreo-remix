import type { ReactNode } from "react";
import { Center } from "@mantine/core";
import Loading from "./Loading";

export default function CenteredLoading({ message }: { message: ReactNode }) {
	return (
		<Center h="100%">
			<Loading message={message} />
		</Center>
	);
}
