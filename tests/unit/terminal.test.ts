import { describe, expect, it } from "bun:test";
import { complete, run, type TerminalContext } from "../../src/scripts/terminal";

const ctx: TerminalContext = {
	posts: [
		{ slug: "hello-world", title: "Hello world", url: "/blog/hello-world/", date: "2026-11-01" },
		{ slug: "astro-and-bun", title: "Astro and Bun", url: "/blog/astro-and-bun/", date: "2026-10-01" },
	],
	stack: ["TypeScript", "Astro"],
	links: { github: "https://github.com/x", mail: "mailto:x@example.com", signal: "https://signal.me/x" },
	location: "Eindhoven",
};
const empty: TerminalContext = { ...ctx, posts: [] };

describe("run", () => {
	it("does nothing for empty input", () => {
		expect(run("   ", ctx)).toEqual({ output: [] });
	});

	it("lists commands with help", () => {
		const { output } = run("help", ctx);
		expect(output.some((line) => line.startsWith("help"))).toBe(true);
		expect(output.some((line) => line.startsWith("pet"))).toBe(true);
	});

	it("lists posts, or says there are none", () => {
		expect(run("ls posts", ctx).output).toEqual(["2026-11-01  hello-world", "2026-10-01  astro-and-bun"]);
		expect(run("ls", empty).output[0]).toContain("no posts yet");
		expect(run("ls secrets", ctx).output[0]).toContain("no such directory");
	});

	it("opens a post by slug or slug prefix", () => {
		expect(run("cat astro", ctx).effect).toEqual({ type: "navigate", url: "/blog/astro-and-bun/" });
		expect(run("cat nope", ctx).output[0]).toContain("no such post");
		expect(run("cat", ctx).output[0]).toContain("usage");
	});

	it("opens external links and pages", () => {
		expect(run("open github", ctx).effect).toEqual({ type: "navigate", url: "https://github.com/x", external: true });
		expect(run("open mail", ctx).effect).toEqual({ type: "navigate", url: "mailto:x@example.com", external: true });
		expect(run("open writing", ctx).effect).toEqual({ type: "navigate", url: "/blog/" });
		expect(run("cd ~/tags/", ctx).effect).toEqual({ type: "navigate", url: "/tags/" });
		expect(run("open moon", ctx).output[0]).toContain("not found");
	});

	it("talks to the other islands", () => {
		expect(run("pet", ctx).effect).toEqual({ type: "pet-cat" });
		expect(run("theme", ctx).effect).toEqual({ type: "toggle-theme" });
		expect(run("clear", ctx).effect).toEqual({ type: "clear" });
	});

	it("is case-insensitive for commands and helpful for unknown ones", () => {
		expect(run("STACK", ctx).output[0]).toBe("TypeScript · Astro");
		expect(run("rm -rf /", ctx).output[0]).toContain("command not found: rm");
	});
});

describe("complete", () => {
	it("completes unique command names", () => {
		expect(complete("sta", ctx)).toBe("stack ");
		expect(complete("c", ctx)).toBeUndefined(); // cat, clear
	});

	it("completes post slugs and open targets", () => {
		expect(complete("cat hel", ctx)).toBe("cat hello-world");
		expect(complete("open git", ctx)).toBe("open github");
	});
});
