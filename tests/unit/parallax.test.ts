import { describe, expect, it } from "bun:test";
import { GLOW_PARALLAX, glowShift } from "../../src/scripts/parallax";

describe("glowShift", () => {
	it("moves the glow with the page at 50%", () => {
		expect(GLOW_PARALLAX).toBe(0.5);
		expect(glowShift(0)).toBe("0px");
		expect(glowShift(200)).toBe("100px");
		expect(glowShift(-80)).toBe("-40px");
	});
});
