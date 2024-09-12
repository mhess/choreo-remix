import { Button, Group, Menu } from "@mantine/core";
import { useAtom } from "jotai";

import { type Platform, platformAtom } from "~/lib/atoms";

import PlatformItems, { logoByPlatform } from "./PlatformItems";

export default () => {
	const [platform] = useAtom(platformAtom);

	return (
		<Menu trigger="hover">
			<Menu.Target>
				<Button visibleFrom="mobile" variant="outline">
					<Group gap="0.25rem">
						{logoByPlatform[platform]}
						{labelByPlatform[platform]}
					</Group>
				</Button>
			</Menu.Target>
			<Menu.Dropdown>
				<PlatformItems />
			</Menu.Dropdown>
		</Menu>
	);
};

const labelByPlatform: Record<Platform, string> = {
	spotify: "Spotify",
	youtube: "YouTube",
	landing: "Select Platform",
};
