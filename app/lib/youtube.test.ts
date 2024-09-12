import { describe, it, expect } from "vitest";

import { extractVideoIdFromUrl } from "./youtube";

describe("extractVideoIdFromUrl", () => {
	it("Returns null with incorrect host", () => {
		expect(extractVideoIdFromUrl("http://foo.com")).toBe(null);
	});

	it("Returns null with incorrect path", () => {
		expect(
			extractVideoIdFromUrl("http://www.youtube.com/listen?v=videoId"),
		).toBe(null);
	});

	it("Returns null if there's no v param", () => {
		expect(
			extractVideoIdFromUrl("http://www.youtube.com/watch?b=videoId"),
		).toBe(null);
	});

	it("Returns the video ID if it's properly formatted URL", () => {
		expect(
			extractVideoIdFromUrl("http://www.youtube.com/watch?v=videoId"),
		).toEqual("videoId");
	});
});
