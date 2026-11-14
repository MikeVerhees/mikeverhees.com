// Lets `bun test` import .svelte files by compiling them with the Svelte
// compiler. Loaded via bunfig.toml [test].preload.
import { plugin } from "bun";
import { compile } from "svelte/compiler";

plugin({
	name: "svelte",
	setup(build) {
		build.onLoad({ filter: /\.svelte$/ }, async ({ path }) => {
			const source = await Bun.file(path).text();
			// Strip TypeScript from <script lang="ts"> with Bun's transpiler.
			const transpiler = new Bun.Transpiler({ loader: "ts" });
			const withoutTs = source.replace(
				/(<script[^>]*lang="ts"[^>]*>)([\s\S]*?)(<\/script>)/,
				(_, open: string, code: string, close: string) =>
					open.replace(' lang="ts"', "") + transpiler.transformSync(code) + close,
			);
			const { js } = compile(withoutTs, { filename: path, generate: "server" });
			return { contents: js.code, loader: "js" };
		});
	},
});
