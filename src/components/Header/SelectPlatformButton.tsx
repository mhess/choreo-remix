import { Button, Group, Menu } from "@mantine/core";
import { useAtom } from "jotai";

import { platformAtom } from "~/lib/platformAtoms";

import PlatformItems, {
	logoByPlatform,
	labelByPlatform,
} from "./PlatformItems";

export default function SelectPlatformButton() {
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
}
