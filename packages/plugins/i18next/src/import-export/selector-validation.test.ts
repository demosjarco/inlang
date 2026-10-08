import { expect, test } from "vitest";
import { plugin } from "../plugin.js";

test("rejects unsupported selectors rather than silently dropping variants", async () => {
	await expect(
		plugin.exportFiles!({
			settings: {
				baseLocale: "en",
				locales: ["en"],
				modules: [],
				"plugin.inlang.i18next": { pathPattern: "./{locale}.json" },
			},
			bundles: [{ id: "greeting", declarations: [] }],
			messages: [
				{
					id: "message",
					bundle_id: "greeting",
					locale: "en",
					selectors: [{ type: "variable-reference", name: "audience" }],
				},
			],
			variants: [
				{
					id: "formal",
					message_id: "message",
					matches: [
						{ type: "literal-match", key: "audience", value: "formal" },
					],
					pattern: [{ type: "text", value: "Welcome" }],
				},
				{
					id: "fallback",
					message_id: "message",
					matches: [{ type: "catchall-match", key: "audience" }],
					pattern: [{ type: "text", value: "Hi" }],
				},
			],
		})
	).rejects.toThrow('cannot represent selector "audience"');
});
