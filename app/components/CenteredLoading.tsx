import type { ReactNode } from "react";
import { Center } from "@mantine/core";
import Loading from "./Loading";

export default ({ message }: { message: ReactNode }) => (
	<Center h="100%">
		<Loading message={message} />
	</Center>
);
