import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// @ts-ignore
global.Blob = class Blob {
	bits: string[];
	type: string;

	constructor(bits: string[], opts: { type: string }) {
		this.bits = bits;
		this.type = opts.type;
	}

	async text() {
		return this.bits.join("");
	}
};

// @ts-ignore
global.File = class File extends Blob {
	name: string;

	constructor(bits: string[], name: string, opts: { type: string }) {
		super(bits, opts);
		this.name = name;
	}
};

global.URL.createObjectURL = vi.fn();
global.URL.revokeObjectURL = vi.fn();

afterEach(cleanup);

Object.defineProperties(window, {
	matchMedia: {
		writable: true,
		value: (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => {},
		}),
	},
	alert: { writable: false, value: vi.fn() },
});
