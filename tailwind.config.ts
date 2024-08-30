import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const fullHeight = { height: "100%" };

export default {
	content: ["./app/**/*.{ts,tsx}"],
	theme: {
		extend: {},
	},
	plugins: [
		plugin(({ addBase, theme }) =>
			addBase({
				h1: { fontSize: theme("fontSize.2xl"), margin: "1.5rem 0 0.75rem" },
				h2: { fontSize: theme("fontSize.xl") },
				h3: { fontSize: theme("fontSize.lg") },
				p: { marginBottom: "0.5rem" },
				a: { color: "blue", textDecoration: "underline", cursor: "pointer" },
				body: fullHeight,
				html: fullHeight,
			}),
		),
	],
} satisfies Config;
