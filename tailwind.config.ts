import type { Config } from "tailwindcss";

export default {
	content: ["./app/**/*.{ts,tsx}"],
	theme: { extend: {} },
	corePlugins: { preflight: false },
} satisfies Config;
