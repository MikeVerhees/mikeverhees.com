export const site = {
	title: "Mike Verhees",
	handle: "~/mikeverhees",
	url: "https://mikeverhees.com/",
	language: "en",
	description: "Mike Verhees is a software developer in Eindhoven building software that is easy to use, secure and privacy-respecting.",
	location: "Eindhoven, the Netherlands",
	author: {
		name: "Mike Verhees",
		email: "mail@mikeverhees.com",
		url: "https://mikeverhees.com/",
	},
	nav: [
		{ title: "writing", url: "/blog/" },
		{ title: "tags", url: "/tags/" },
		{ title: "about", url: "/about/" },
	],
	// Skills shown in the ~/stack card and by the terminal `stack` command.
	stack: ["TypeScript", "JavaScript", "Node.js", "Bun", "React", "Astro", "Svelte", "PostgreSQL", "MongoDB", "GitHub Actions"],
	links: {
		mail: "mailto:mail@mikeverhees.com",
		signal: "https://signal.me/#eu/Qqf0k8jf2n5yuuuJ5e8-2Prv9eCg8paIW9WTvk6YLSv0F8-QSP5IPqcqcarqHSm8",
		github: "https://github.com/mikeverhees",
	},
} as const;
