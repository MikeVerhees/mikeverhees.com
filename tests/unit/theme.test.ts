import { describe, expect, it } from "bun:test";
import { currentTheme, nextTheme } from "../../src/scripts/theme";

const root = (theme?: string) => ({ dataset: theme ? { theme } : {} }) as unknown as HTMLElement;

describe("currentTheme", () => {
	it("follows the system preference when nothing was picked", () => {
		expect(currentTheme(root(), true)).toBe("dark");
		expect(currentTheme(root(), false)).toBe("light");
	});

	it("prefers an explicit choice over the system preference", () => {
		expect(currentTheme(root("light"), true)).toBe("light");
		expect(currentTheme(root("dark"), false)).toBe("dark");
	});

	it("ignores unknown values", () => {
		expect(currentTheme(root("sepia"), false)).toBe("light");
	});
});

describe("nextTheme", () => {
	it("flips between light and dark", () => {
		expect(nextTheme("light")).toBe("dark");
		expect(nextTheme("dark")).toBe("light");
	});
});
