import { useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

export const displayMs = (totalMs: number) => {
	const ms = (totalMs % 1000).toString().slice(0, 2).padStart(2, "0");
	const totalSeconds = Math.floor(totalMs / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = (totalSeconds % 60).toString().padStart(2, "0");

	return `${minutes}:${seconds}.${ms}`;
};

export const useMobileBreakpoint = () => {
	const { mobile } = useMantineTheme().breakpoints;

	return useMediaQuery(`(max-width: ${mobile})`);
};

// biome-ignore lint/suspicious/noExplicitAny: need to be able to use any
export const debounced = (fn: (...rest: any[]) => void, timeMs: number) => {
	let timeoutId = 0;
	// biome-ignore lint/suspicious/noExplicitAny: need to be able to use any
	return (...args: any[]) => {
		clearTimeout(timeoutId);
		timeoutId = window.setTimeout(() => fn(...args), timeMs);
	};
};
