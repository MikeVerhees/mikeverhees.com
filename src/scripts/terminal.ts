// Pure command interpreter for the mini terminal (no DOM), unit tested.

export interface TerminalPost {
	slug: string;
	title: string;
	url: string;
	date: string;
}

export interface TerminalContext {
	posts: TerminalPost[];
	stack: readonly string[];
	links: { github: string; mail: string; signal: string };
	location: string;
}

export type TerminalEffect =
	| { type: "clear" }
	| { type: "navigate"; url: string; external?: boolean }
	| { type: "pet-cat" }
	| { type: "toggle-theme" };

export interface TerminalResult {
	output: string[];
	effect?: TerminalEffect;
}

export const COMMANDS: Record<string, string> = {
	help: "list commands",
	about: "who is Mike?",
	"ls [posts]": "list posts",
	"cat <post>": "open a post",
	"open <name>": "github · mail · signal · writing · tags · about",
	stack: "languages and tools I work with",
	pet: "pet the cat",
	theme: "toggle light/dark",
	clear: "clear the screen",
};

const PAGES: Record<string, string> = {
	writing: "/blog/",
	blog: "/blog/",
	tags: "/tags/",
	about: "/about/",
	home: "/",
};

export function complete(input: string, ctx: TerminalContext): string | undefined {
	const [command, ...rest] = input.trimStart().split(/\s+/);
	const arg = rest.join(" ");
	if (rest.length === 0) {
		const names = ["help", "about", "ls", "cat", "open", "stack", "pet", "theme", "clear", "whoami"];
		const match = names.filter((n) => n.startsWith(command));
		return match.length === 1 ? `${match[0]} ` : undefined;
	}
	const options =
		command === "cat"
			? ctx.posts.map((p) => p.slug)
			: command === "open"
				? ["github", "mail", "signal", ...Object.keys(PAGES)]
				: [];
	const match = options.filter((o) => o.startsWith(arg));
	return match.length === 1 ? `${command} ${match[0]}` : undefined;
}

export function run(input: string, ctx: TerminalContext): TerminalResult {
	const trimmed = input.trim();
	if (!trimmed) return { output: [] };

	const [rawCommand, ...args] = trimmed.split(/\s+/);
	const command = rawCommand.toLowerCase();
	const arg = args.join(" ").toLowerCase();

	switch (command) {
		case "help":
		case "?":
			return {
				output: Object.entries(COMMANDS).map(([name, description]) => `${name.padEnd(14)}${description}`),
			};

		case "about":
		case "whoami":
			return {
				output: [
					`Mike Verhees · software developer · ${ctx.location}`,
					"Building software that is easy to use, secure and privacy-respecting.",
					"Type `open about` for more.",
				],
			};

		case "ls":
		case "dir":
			if (arg && arg !== "posts" && arg !== "writing") return { output: [`ls: ${args[0]}: no such directory`] };
			if (ctx.posts.length === 0) return { output: ["no posts yet, the first one is on its way"] };
			return { output: ctx.posts.map((p) => `${p.date}  ${p.slug}`) };

		case "cat":
		case "less":
		case "more": {
			if (!arg) return { output: ["usage: cat <post>  (see `ls posts`)"] };
			const post = ctx.posts.find((p) => p.slug === arg) ?? ctx.posts.find((p) => p.slug.startsWith(arg));
			if (!post) return { output: [`cat: ${args[0]}: no such post`] };
			return { output: [`opening ${post.title}…`], effect: { type: "navigate", url: post.url } };
		}

		case "open":
		case "cd": {
			if (!arg) return { output: ["usage: open <github|mail|signal|writing|tags|about>"] };
			if (arg === "github") return { output: ["opening GitHub…"], effect: { type: "navigate", url: ctx.links.github, external: true } };
			if (arg === "mail" || arg === "email") return { output: ["opening your mail app…"], effect: { type: "navigate", url: ctx.links.mail, external: true } };
			if (arg === "signal") return { output: ["opening Signal…"], effect: { type: "navigate", url: ctx.links.signal, external: true } };
			const page = PAGES[arg.replace(/^[~/]+|\/$/g, "")];
			if (page) return { output: [`cd ${page}`], effect: { type: "navigate", url: page } };
			return { output: [`open: ${args[0]}: not found`] };
		}

		case "stack":
			return { output: [ctx.stack.join(" · ")] };

		case "pet":
			return { output: ["🐾 the cat wakes up and purrs"], effect: { type: "pet-cat" } };

		case "theme":
			return { output: ["toggling theme…"], effect: { type: "toggle-theme" } };

		case "clear":
		case "cls":
			return { output: [], effect: { type: "clear" } };

		case "echo":
			return { output: [args.join(" ")] };

		case "sudo":
			return { output: ["nice try 😼"] };

		case "exit":
			return { output: ["there is no escape, but there is `open writing`"] };

		default:
			return { output: [`command not found: ${rawCommand}. Type \`help\` for a list.`] };
	}
}
